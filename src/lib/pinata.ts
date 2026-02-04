export const config = {
    api: {
        bodyParser: false,
    },
};

export async function uploadToPinata(file: Blob, filename: string): Promise<string> {
    const data = new FormData();
    data.append("file", file, filename);
    data.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
    data.append("pinataMetadata", JSON.stringify({ name: filename }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
        body: data,
    });

    if (!res.ok) {
        throw new Error(`Pinata upload failed: ${res.statusText}`);
    }

    const json = await res.json();
    const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL || "cloudflare-ipfs.com";
    return `https://${gateway}/ipfs/${json.IpfsHash}`;
}
