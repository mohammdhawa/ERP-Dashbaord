import { Modal, Spinner } from "react-bootstrap";

// Placeholder shown while a lazily-imported form modal's chunk is still in
// flight.
//
// READ THE `fallback={open ? <ModalFallback /> : null}` PATTERN AT THE CALL
// SITES CAREFULLY — the conditional is the whole point, and replacing it with a
// bare `fallback={<ModalFallback />}` would be a regression:
//
// The lazy modal element is rendered unconditionally (with open={false}) so its
// chunk starts downloading when the LIST page mounts, long before anyone presses
// "إضافة". That prefetch is the reason opening the form is normally instant, and
// it must stay. But it also means the Suspense boundary is suspended during
// ordinary page load, when no modal is open and nothing should be on screen —
// so the fallback has to be null in that state.
//
// Gating the fallback on the same flag that opens the modal gives both: silence
// while prefetching, and a real "the form is coming" signal in the one case that
// actually needs it — a click that lands on a slow connection before the chunk
// has arrived, which previously left the button looking simply broken.
const ModalFallback = () => (
  <Modal show centered backdrop="static" keyboard={false}>
    <Modal.Body className="text-center py-5">
      <Spinner animation="border" role="status" className="mb-3">
        <span className="visually-hidden">جارٍ التحميل</span>
      </Spinner>
      <p className="text-muted mb-0">جارٍ فتح النموذج…</p>
    </Modal.Body>
  </Modal>
);

export default ModalFallback;
