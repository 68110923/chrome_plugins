function getCookieValue(cookieName) {
    const cookieArr = document.cookie.split('; ');
    for (let cookie of cookieArr) {
        const [key, value] = cookie.split('=');
        if (key === cookieName) {
            return decodeURIComponent(value);
        }
    }
    return null;
}