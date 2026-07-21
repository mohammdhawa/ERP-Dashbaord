import React, { useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { FilePond, registerPlugin } from "react-filepond";
// plugins
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
// and – very important – the CSS imports:
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";

import { useDispatch } from "react-redux";
import { updateProfile } from "../../redux/actions/authActions";
import imageCompression from "browser-image-compression";
import PropTypes from "prop-types";

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview
);

const EditProfileModal = ({ show, onHide, profile }) => {
  const dispatch = useDispatch();

  // Store just File objects here
  const [files, setFiles] = useState([]);

  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    let imageFile = null;
    if (files.length > 0) {
      try {
        imageFile = await imageCompression(files[0], {
          maxSizeMB: 1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });
      } catch {
        imageFile = files[0];
      }
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    if (imageFile) formData.append("image", imageFile);

    await dispatch(updateProfile(formData));
    setSubmitting(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>تعديل الملف الشخصي</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col>
              <FilePond
                files={files}
                onupdatefiles={(fileItems) => {
                
                  setFiles(fileItems.map((item) => item.file));
                }}
                allowMultiple={false}
                instantUpload={false}
                allowProcess={false}
                labelIdle='اسحب وأسقط الصورة أو <span class="filepond--label-action">تصفح</span>'
                imagePreviewMaxHeight={200}
                acceptedFileTypes={["image/*"]}
                maxFiles={1}
              />
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>الاسم</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>رقم الهاتف</Form.Label>
            <Form.Control
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={submitting}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              حفظ
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

EditProfileModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  profile: PropTypes.shape({
    name: PropTypes.string,
    phone: PropTypes.string,
    image: PropTypes.string,
  }),
};

export default EditProfileModal;
