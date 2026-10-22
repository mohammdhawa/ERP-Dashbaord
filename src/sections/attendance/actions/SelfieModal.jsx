import React, { useEffect, useState } from "react";
import { Alert, Modal, Spinner } from "react-bootstrap";
import { fetchBlobUrl } from "../../../utils/fileDownload";
import { parseApiError } from "../../../utils/apiHelpers";

// صورة التسجيل — GET /attendance/records/{id}/selfie (API doc §13.2). The file is
// private, so it is fetched as a blob through `api` and shown from an object
// URL; a record without a photo answers 404 «لا توجد صورة لهذا السجل.», shown
// as the server wrote it.

const SelfieModal = ({ show, recordId, onHide }) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show || !recordId) return undefined;

    let cancelled = false;
    let objectUrl = null;
    setUrl(null);
    setError(null);
    setLoading(true);

    fetchBlobUrl(`/attendance/records/${recordId}/selfie`)
      .then(({ url: loaded }) => {
        if (cancelled) {
          // Closed (or retargeted) while the bytes were in flight: nobody will
          // ever see this URL, so release it here.
          URL.revokeObjectURL(loaded);
          return;
        }
        objectUrl = loaded;
        setUrl(loaded);
      })
      .catch((err) => {
        if (!cancelled) setError(parseApiError(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [show, recordId]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6">صورة التسجيل</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {loading && <Spinner animation="border" role="status" />}
        {!loading && error && (
          <Alert variant="danger" className="mb-0 py-2 px-3" role="alert">
            {error}
          </Alert>
        )}
        {!loading && url && (
          <img
            src={url}
            alt="صورة التسجيل"
            className="img-fluid rounded"
            style={{ maxHeight: "70vh" }}
          />
        )}
      </Modal.Body>
    </Modal>
  );
};

export default SelfieModal;
