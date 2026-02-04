export const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);
};

export const optimizeImage = (url: string | null | undefined): string => {
    if (!url) return "";

    // Replace slow Pinata gateway with fast Cloudflare gateway
    if (url.includes("gateway.pinata.cloud")) {
        return url.replace("gateway.pinata.cloud", "cloudflare-ipfs.com");
    }

    return url;
};
