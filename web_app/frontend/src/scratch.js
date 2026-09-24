const btoa_safe = (str) => btoa(encodeURIComponent(str));
const atob_safe = (str) => decodeURIComponent(atob(str));
