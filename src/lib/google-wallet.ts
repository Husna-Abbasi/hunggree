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

    static async createLoyaltyClass(programId: string, programName: string, issuerName: string, logoUrl?: string) {
        const client = await this.getClient();
        const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass`;

        const classId = `${ISSUER_ID}.${programId}`;

        const loyaltyClass = {
            id: classId,
            issuerName: issuerName,
            programName: programName,
            programLogo: logoUrl ? {
                sourceUri: { uri: logoUrl }
            } : undefined,
            reviewStatus: 'UNDER_REVIEW',
        };

        try {
            const res = await client.request({
                url,
                method: 'POST',
                data: loyaltyClass
            });
            return classId;
        } catch (e: any) {
            if (e.response?.status === 409) return classId;
            throw e;
        }
    }

    // Update loyalty pass points in Google Wallet (creates pass if it doesn't exist)
    static async updateLoyaltyObject(objectId: string, newPoints: number, classId?: string, userId?: string, memberName?: string) {
        if (!ISSUER_ID) throw new Error("Missing ISSUER_ID");

        const client = await this.getClient();
        const fullObjectId = objectId.includes('.') ? objectId : `${ISSUER_ID}.${objectId}`;

        console.log('[GoogleWallet] Updating pass:', { objectId, fullObjectId, newPoints });

        // First try PATCH (update existing)
        try {
            const patchUrl = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${fullObjectId}`;
            const patchData: any = {
                loyaltyPoints: {
                    label: 'Points',
                    balance: { string: newPoints.toString() }
                }
            };

            // Also update member name if provided
            if (memberName) {
                patchData.accountName = memberName;
            }

            const res = await client.request({
                url: patchUrl,
                method: 'PATCH',
                data: patchData
            });
            console.log('[GoogleWallet] ✅ Updated pass points:', fullObjectId, '→', newPoints, memberName ? `(${memberName})` : '');
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
                        barcode: {
                            type: 'QR_CODE',
                            value: userId,
                            alternateText: userId,
                        },
                        loyaltyPoints: {
                            label: 'Points',
                            balance: { string: newPoints.toString() }
                        },
                        accountName: memberName || 'Member',
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

    static generateAddToWalletLink(classId: string, objectId: string, userId: string, points: number, restaurantName: string, memberName?: string) {
        if (!PRIVATE_KEY || !CLIENT_EMAIL || !ISSUER_ID) throw new Error("Missing Credentials");

        const loyaltyObject = {
            id: `${ISSUER_ID}.${objectId}`,
            classId: classId,
            state: 'ACTIVE',
            accountId: userId,
            barcode: {
                type: 'QR_CODE',
                value: userId,
                alternateText: userId,
            },
            loyaltyPoints: {
                label: 'Points',
                balance: { string: points.toString() }
            },
            accountName: memberName || 'Member',
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
