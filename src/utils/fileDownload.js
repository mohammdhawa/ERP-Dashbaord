// Downloads from the streamed (private) endpoints: reports, exports, selfies,
// attachments. They sit behind the bearer token, so a plain <a href> to the API
// would arrive unauthenticated; the bytes are fetched through `api` as a blob
// and handed to the browser as an object URL instead.

// `Content-Disposition` carries the server's own filename, often Arabic. The
// RFC 5987 `filename*=UTF-8''…` form is the one that survives non-ASCII, so it
// wins over the plain `filename="…"` (which is usually an ASCII stand-in).
export const filenameFromDisposition = (header, fallback) => {
  if (!header) return fallback;

  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      const decoded = decodeURIComponent(encoded[1].trim());
      if (decoded) return decoded;
    } catch {
      // Malformed percent-encoding: fall through to the plain filename.
    }
  }

  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/i.exec(header);
  const name = plain ? (plain[1] ?? plain[2] ?? "").trim() : "";
  return name || fallback;
};

// With responseType "blob" an error body is a Blob too, so `data.message` is
// unreadable and parseApiError would show the generic fallback. Read the blob
// back as the JSON envelope; if it is not JSON, leave `data` empty so the
// status-based fallback applies rather than showing raw bytes.
const unwrapBlobError = async (error) => {
  const data = error?.response?.data;
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    let parsed = null;
    try {
      parsed = JSON.parse(await data.text());
    } catch {
      parsed = null;
    }
    error.response.data = parsed;
  }
  return error;
};

// Resolves to { url, filename }. The CALLER owns the URL and must revoke it
// (URL.revokeObjectURL) when done, e.g. when an <img> unmounts. `filename` is
// null when the server named none.
export const fetchBlobUrl = async (path) => {
  // Lazy: api.js reads import.meta.env, which Node's test runner cannot load,
  // and the pure helper above is unit-tested.
  const { default: api } = await import("../redux/api");
  try {
    const response = await api.get(path, { responseType: "blob" });
    return {
      url: URL.createObjectURL(response.data),
      filename: filenameFromDisposition(
        response.headers?.["content-disposition"],
        null
      ),
    };
  } catch (error) {
    throw await unwrapBlobError(error);
  }
};

export const downloadFile = async (path, fallbackName) => {
  const { url, filename } = await fetchBlobUrl(path);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking in the same tick can cancel the save in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
