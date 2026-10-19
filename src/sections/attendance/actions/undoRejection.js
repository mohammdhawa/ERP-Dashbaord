import api from "../../../redux/api";
import { parseApiError } from "../../../utils/apiHelpers";
import { confirmDestructive, toastNotify } from "../../../utils";
import { formatAbsolute } from "../../system/auditFormat";

// التراجع عن الرفض — DELETE /attendance/records/{id}/reject (API doc §13.5).
// A plain function rather than a component: the callers (records list, daily
// board, day grid) only need "ask, send, tell me what came back".
//
// Resolves to {record, restored_records}, or null when the dialog is cancelled.
// A 422 (the day was recorded again since, or the record is not refused) is
// toasted with the server's text and rethrown so the caller can stop its
// spinner.
const undoRejection = async (record) => {
  const name = record?.employee?.full_name;
  const when = record?.recorded_at ? formatAbsolute(record.recorded_at) : "";
  const subject = [name, when].filter(Boolean).join(" — ");

  const confirmed = await confirmDestructive({
    action: "التراجع عن الرفض",
    subject,
    text: "يعود التسجيل (وما رُفض معه) محسوباً في الحضور، ولا يُرسَل إشعار إلى الموظف.",
    confirmButtonText: "تراجع",
  });
  if (!confirmed) return null;

  let response;
  try {
    response = await api.delete(`/attendance/records/${record.id}/reject`);
  } catch (err) {
    const parsed = parseApiError(err);
    toastNotify(parsed.message, "error");
    throw parsed;
  }
  toastNotify(response.data.message, "success");
  return response.data.data;
};

export default undoRejection;
