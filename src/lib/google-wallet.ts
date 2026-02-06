import { JWT } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;

// Robust Private Key Handling with multiple parsing approaches
function parsePrivateKey(raw: string | undefined): string | undefined {
    if (!raw) return undefined;

    let key = raw;

    // 1. If it's a JSON object (full service account file), extract private_key
    if (key.trim().startsWith('{')) {
        try {
            const json = JSON.parse(key);
            if (json.private_key) {
                key = json.private_key;
            }
        } catch (e) {
            console.warn("GOOGLE_PRIVATE_KEY looks like JSON but failed to parse");
        }
    }

    // 2. Handle various newline formats
    // Replace literal \n strings with actual newlines
    key = key.replace(/\\n/g, '\n');

    // 3. Remove surrounding quotes if present (some env systems add them)
    if ((key.startsWith('"') && key.endsWith('"')) ||
        (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1);
        // After removing quotes, process newlines again
        key = key.replace(/\\n/g, '\n');
    }

    // 4. Normalize line endings
    key = key.replace(/\r\n/g, '\n');

    // Debug: Log key format (safe - only shows structure, not actual key content)
    const hasBegin = key.includes('-----BEGIN');
    const hasEnd = key.includes('-----END');
    const lineCount = key.split('\n').length;
    console.log(`[GoogleWallet] Key parsing: hasBegin=${hasBegin}, hasEnd=${hasEnd}, lines=${lineCount}`);

    return key;
}

const PRIVATE_KEY = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

if (!ISSUER_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    console.warn("Missing Google Wallet credentials. Loyalty features will not work.");
}

// Design options for pass customization
export interface PassDesignOptions {
    logoUrl?: string;
    wideLogoUrl?: string;
    heroImageUrl?: string;
    backgroundColor?: string; // Hex color e.g. '#4CAF50'
}

export class GoogleWalletService {
    private static scopes = ['https://www.googleapis.com/auth/wallet_object.issuer'];

    static async getClient() {
        if (!PRIVATE_KEY || !CLIENT_EMAIL) throw new Error("Missing Google Credentials");

        const client = new JWT({
            email: CLIENT_EMAIL,
            key: PRIVATE_KEY,
            scopes: this.scopes,
        });

        return client;
    }

    static async createLoyaltyClass(
        programId: string,
        programName: string,
        issuerName: string,
        design?: PassDesignOptions
    ) {
        const client = await this.getClient();
        const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass`;

        const classId = `${ISSUER_ID}.${programId}`;

        const loyaltyClass: any = {
            id: classId,
            issuerName: issuerName,
            programName: programName,
            reviewStatus: 'UNDER_REVIEW',
        };

        // Apply design options
        if (design?.logoUrl) {
            loyaltyClass.programLogo = {
                sourceUri: { uri: design.logoUrl }
            };
        }
        if (design?.wideLogoUrl) {
            loyaltyClass.wideProgramLogo = {
                sourceUri: { uri: design.wideLogoUrl }
            };
        }
        if (design?.heroImageUrl) {
            loyaltyClass.heroImage = {
                sourceUri: { uri: design.heroImageUrl }
            };
        }
        if (design?.backgroundColor) {
            loyaltyClass.hexBackgroundColor = design.backgroundColor;
        }

        try {
            const res = await client.request({
                url,
                method: 'POST',
                data: loyaltyClass
            });
            return classId;
        } catch (e: any) {
            if (e.response?.status === 409) {
                // Class exists, update it instead
                await this.updateLoyaltyClass(classId, programName, issuerName, design);
                return classId;
            }
            throw e;
        }
    }

    // Update existing loyalty class design
    static async updateLoyaltyClass(
        classId: string,
        programName?: string,
        issuerName?: string,
        design?: PassDesignOptions
    ) {
        const client = await this.getClient();
        const fullClassId = classId.includes('.') ? classId : `${ISSUER_ID}.${classId}`;
        const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${fullClassId}`;

        try {
            // First GET the existing class to preserve required fields
            const getRes = await client.request({ url, method: 'GET' });
            const existingClass = getRes.data as any;

            // Set valid reviewStatus - can't use APPROVED for updates
            existingClass.reviewStatus = 'UNDER_REVIEW';

            // Merge updates into existing class
            if (programName) existingClass.programName = programName;
            if (issuerName) existingClass.issuerName = issuerName;

            if (design?.logoUrl) {
                existingClass.programLogo = { sourceUri: { uri: design.logoUrl } };
            }
            if (design?.wideLogoUrl) {
                existingClass.wideProgramLogo = { sourceUri: { uri: design.wideLogoUrl } };
            }
            if (design?.heroImageUrl) {
                existingClass.heroImage = { sourceUri: { uri: design.heroImageUrl } };
            }
            if (design?.backgroundColor) {
                existingClass.hexBackgroundColor = design.backgroundColor;
            }

            // Use PUT to update the entire class
            const res = await client.request({
                url,
                method: 'PUT',
                data: existingClass
            });
            console.log('[GoogleWallet] ✅ Updated loyalty class design:', fullClassId);
            return res.data;
        } catch (e: any) {
            console.error('[GoogleWallet] ❌ Failed to update class:', e.response?.data?.error || e.message);
            throw e;
        }
    }

    // Archive/delete loyalty pass in Google Wallet (sets state to EXPIRED)
    static async archiveLoyaltyObject(objectId: string) {
        if (!ISSUER_ID) throw new Error("Missing ISSUER_ID");

        const client = await this.getClient();
        const fullObjectId = objectId.includes('.') ? objectId : `${ISSUER_ID}.${objectId}`;

        console.log('[GoogleWallet] Archiving pass:', fullObjectId);

        try {
            const patchUrl = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${fullObjectId}`;
            const res = await client.request({
                url: patchUrl,
                method: 'PATCH',
                data: {
                    state: 'EXPIRED'
                }
            });
            console.log('[GoogleWallet] ✅ Archived pass:', fullObjectId);
            return res.data;
        } catch (e: any) {
            // If 404, pass doesn't exist - that's fine, consider it deleted
            if (e.response?.status === 404) {
                console.log('[GoogleWallet] Pass not found (already deleted):', fullObjectId);
                return null;
            }
            console.error('[GoogleWallet] ❌ Failed to archive pass:', e.response?.data?.error || e.message);
            throw e;
        }
    }

    // Update loyalty pass points in Google Wallet (creates pass if it doesn't exist)
    static async updateLoyaltyObject(objectId: string, newPoints: number, classId?: string, userId?: string, memberName?: string, phoneNumber?: string, fields?: { name: boolean; phone: boolean; points: boolean }) {
        if (!ISSUER_ID) throw new Error("Missing ISSUER_ID");

        const client = await this.getClient();
        const fullObjectId = objectId.includes('.') ? objectId : `${ISSUER_ID}.${objectId}`;

        console.log('[GoogleWallet] Updating pass:', { objectId, fullObjectId, newPoints, memberName, phoneNumber });

        // First try PATCH (update existing)
        try {
            const patchUrl = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${fullObjectId}`;
            const patchData: any = {};

            // Only update points if enabled
            if (fields?.points !== false) {
                patchData.loyaltyPoints = {
                    label: 'Points',
                    balance: { string: newPoints.toString() }
                };
            }

            // Update all pass details
            // Update accountName only if name field is enabled (or undefined/default true)
            if (fields?.name !== false && memberName) {
                patchData.accountName = memberName;
            }

            // Update accountId to unique objectId
            patchData.accountId = objectId;

            // Update barcode with unique ID
            patchData.barcode = {
                type: 'QR_CODE',
                value: objectId,
                alternateText: objectId,
            };

            // Update text modules with name and phone
            const textModules = [];

            // NOTE: "Name" text module removed to avoid duplication with accountName

            if (fields?.phone !== false && phoneNumber) {
                textModules.push({
                    header: 'Phone',
                    body: phoneNumber
                });
            }
            patchData.textModulesData = textModules;

            const res = await client.request({
                url: patchUrl,
                method: 'PATCH',
                data: patchData
            });
            console.log('[GoogleWallet] ✅ Updated pass:', fullObjectId, '→', newPoints, memberName ? `(${memberName})` : '');
            return res.data;
        } catch (e: any) {
            // If 404, pass doesn't exist yet - try to create it
            if (e.response?.status === 404 && classId && userId) {
                console.log('[GoogleWallet] Pass not found, creating new pass...');
                try {
                    const createUrl = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject`;
                    const loyaltyObject = {
                        id: fullObjectId,
                        classId: classId,
                        state: 'ACTIVE',
                        accountId: userId,
                        // Only set accountName if name field is enabled
                        ...(fields?.name !== false ? { accountName: memberName || 'Member' } : {}),
                        barcode: {
                            type: 'QR_CODE',
                            value: userId,
                            alternateText: userId,
                        },
                        loyaltyPoints: fields?.points !== false ? {
                            label: 'Points',
                            balance: { string: newPoints.toString() }
                        } : undefined,
                        textModulesData: [
                            // Name removed from text modules to avoid duplication
                            ...(fields?.phone !== false && phoneNumber ? [{ header: 'Phone', body: phoneNumber }] : [])
                        ]
                    };
                    const createRes = await client.request({
                        url: createUrl,
                        method: 'POST',
                        data: loyaltyObject
                    });
                    console.log('[GoogleWallet] ✅ Created new pass with points:', fullObjectId, '→', newPoints);
                    return createRes.data;
                } catch (createError: any) {
                    console.error('[GoogleWallet] ❌ Failed to create pass:', createError.response?.data?.error || createError.message);
                    return null;
                }
            }

            console.error('[GoogleWallet] ❌ Failed to update pass:', {
                status: e.response?.status,
                error: e.response?.data?.error || e.message,
                objectId: fullObjectId
            });
            return null;
        }
    }

    static generateAddToWalletLink(classId: string, objectId: string, userId: string, points: number, restaurantName: string, memberName?: string, phoneNumber?: string, fields?: { name: boolean; phone: boolean; points: boolean }) {
        if (!PRIVATE_KEY || !CLIENT_EMAIL || !ISSUER_ID) throw new Error("Missing Credentials");

        const loyaltyObject: any = {
            id: `${ISSUER_ID}.${objectId}`,
            classId: classId,
            state: 'ACTIVE',
            accountId: objectId,
            // Only set accountName if name field is enabled
            ...(fields?.name !== false ? { accountName: memberName || 'Member' } : {}),
            barcode: {
                type: 'QR_CODE',
                value: objectId,
                alternateText: objectId,
            },
            loyaltyPoints: fields?.points !== false ? {
                label: 'Points',
                balance: { string: points.toString() }
            } : undefined,
            textModulesData: [
                // Name removed from text modules to avoid duplication
                ...(fields?.phone !== false && phoneNumber ? [{
                    header: 'Phone',
                    body: phoneNumber
                }] : [])
            ],
        };

        const claims = {
            iss: CLIENT_EMAIL,
            aud: 'google',
            origins: [],
            typ: 'savetowallet',
            payload: {
                loyaltyObjects: [loyaltyObject]
            }
        };

        const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: 'RS256' });
        return `https://pay.google.com/gp/v/save/${token}`;
    }
}
