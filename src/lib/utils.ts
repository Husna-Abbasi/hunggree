export const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);
};

export const optimizeImage = (url: string | null | undefined): string => {
    if (!url) return "";

    // Replace slow/broken gateways with the main IPFS gateway (most reliable currently)
    if (url.includes("gateway.pinata.cloud") || url.includes("cloudflare-ipfs.com") || url.includes("dweb.link")) {
        return url
            .replace("gateway.pinata.cloud", "ipfs.io")
            .replace("cloudflare-ipfs.com", "ipfs.io")
            .replace("dweb.link", "ipfs.io");
    }

    return url;
};
