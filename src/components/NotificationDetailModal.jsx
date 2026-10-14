import { Modal } from "react-bootstrap";
import { formatAbsolute, formatRelativeAr } from "../sections/system/auditFormat";

// One notification, in full — for a notification with NOWHERE TO GO.
//
// A notification opens where its recipient acts on it (notificationLink: type
// first, then reference). This modal is the fallback for the rest — an
// announcement, or a type whose screen does not exist yet — so that the text
// itself can still be read. The header dropdown can only show a preview line,
// and before this a click on such a row did nothing but mark it read.
//
// No "open the record" button here: a notification that has a record to open
// never reaches this modal; it navigates straight there.
//
// `notification` null = closed.
const NotificationDetailModal = ({ notification, onClose }) => (
  <Modal show={Boolean(notification)} onHide={onClose} centered>
    {notification && (
      <>
        <Modal.Header closeButton>
          <Modal.Title as="h6">{notification.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {notification.body ? (
            // pre-line: keep the line breaks the sender wrote; wrap long text
            // instead of the dropdown's single clipped line.
            <p className="mb-3" style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
              {notification.body}
            </p>
          ) : (
            <p className="mb-3 text-muted">لا يوجد نص إضافي لهذا الإشعار.</p>
          )}
          <div className="d-flex flex-wrap align-items-center gap-2 text-muted fs-12">
            {notification.type && (
              <span className="badge bg-light text-muted">
                {notification.type_label || notification.type}
              </span>
            )}
            <span>{formatRelativeAr(notification.created_at)}</span>
            <span dir="ltr">{formatAbsolute(notification.created_at)}</span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light" onClick={onClose}>
            إغلاق
          </button>
        </Modal.Footer>
      </>
    )}
  </Modal>
);

export default NotificationDetailModal;
