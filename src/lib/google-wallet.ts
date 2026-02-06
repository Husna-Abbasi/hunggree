import { JWT } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;

// Robust Private Key Handling: Support both raw PEM and full JSON Service Account file
let rawKey = process.env.GOOGLE_PRIVATE_KEY;
let parsedKey = rawKey;

if (rawKey?.trim().startsWith('{')) {
    try {
        const json = JSON.parse(rawKey);
        if (json.private_key) {
            parsedKey = json.private_key;
        }
    } catch (e) {
        console.warn("Failed to parse GOOGLE_PRIVATE_KEY as JSON, using as string.");
    }
}

// Handle Vercel's literal \n strings - convert to actual newlines
// The regex handles both escaped \\n and literal backslash-n from env vars
const PRIVATE_KEY = parsedKey?.split(String.raw`\n`).join('\n');

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
        const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass`; // Generic endpoint

        // Class ID format: issuerId.programId
        const classId = `${ISSUER_ID}.${programId}`;

        const loyaltyClass = {
            id: classId,
            issuerName: issuerName,
            programName: programName,
            programLogo: logoUrl ? {
                sourceUri: { uri: logoUrl }
            } : undefined,
            reviewStatus: 'UNDER_REVIEW', // Start as Draft/Under Review
        };

        try {
            // Check if exists first (GET) or just try transparently? 
            // API throws 409 if exists. We can just create and catch 409.
            const res = await client.request({
                url,
                method: 'POST',
                data: loyaltyClass
            });
            return classId;
        } catch (e: any) {
            if (e.response?.status === 409) return classId; // Already exists
            throw e;
        }
    }

    static generateAddToWalletLink(classId: string, objectId: string, userId: string, points: number, restaurantName: string) {
        if (!PRIVATE_KEY || !CLIENT_EMAIL || !ISSUER_ID) throw new Error("Missing Credentials");

        // Define the Loyalty Object
        const loyaltyObject = {
            id: `${ISSUER_ID}.${objectId}`,
            classId: classId,
            state: 'ACTIVE',
            accountId: userId,
            barcode: {
                type: 'QR_CODE',
                value: userId, // Use User ID as barcode value
                alternateText: userId,
            },
            loyaltyPoints: {
                label: 'Points',
                balance: { string: points.toString() }
            },
            accountName: 'Member',
        };

        // Construct the JWT Claims
        const claims = {
            iss: CLIENT_EMAIL,
            aud: 'google',
            origins: [],
            typ: 'savetowallet',
            payload: {
                loyaltyObjects: [loyaltyObject]
            }
        };

        // Sign the JWT
        const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: 'RS256' });
        return `https://pay.google.com/gp/v/save/${token}`;
    }
}
