/* eslint-disable react/prop-types */
import { formatAbsolute } from "../system/auditFormat";
import { reviewBadge, reviewReasonLabel } from "./locationReview";

const metres = (value) => value == null ? null : `${Number(value).toFixed(1)} م`;
const mapHref = (latitude, longitude) =>
  Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) &&
  latitude != null && longitude != null
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`
    : null;

const LocationReviewEvidence = ({ review, record, compact = false }) => {
  const badge = reviewBadge(review);
  const eventMap = record && mapHref(record.latitude, record.longitude);
  const siteMap = review?.site && mapHref(review.site.latitude, review.site.longitude);
  return (
    <div className="d-flex flex-column align-items-start gap-1">
      <span className={`badge ${badge.className}`}>{badge.label}</span>
      {review && (
        <>
          <span className="fs-12">{reviewReasonLabel(review.reason)}</span>
          {review.site?.name && <span className="text-muted fs-12">{review.site.name}</span>}
          {review.distance_m != null && (
            <span className="fs-12" dir="ltr">
              {metres(review.distance_m)}
              {!compact && review.radius_m != null ? ` / ${metres(review.radius_m)}` : ""}
            </span>
          )}
          {!compact && (
            <>
              {review.accuracy_m != null && <span className="text-muted fs-12">دقة GPS: {metres(review.accuracy_m)}</span>}
              {review.fix_at && <span className="text-muted fs-12">وقت GPS: <span dir="ltr">{formatAbsolute(review.fix_at)}</span></span>}
              {review.is_mocked && <span className="text-danger fs-12">موقع محاكى</span>}
              {(eventMap || siteMap) && <span className="d-flex gap-2 fs-12">
                {eventMap && <a href={eventMap} target="_blank" rel="noreferrer">موقع التسجيل</a>}
                {siteMap && <a href={siteMap} target="_blank" rel="noreferrer">موقع العمل</a>}
              </span>}
              {review.approved_by?.name && <span className="text-muted fs-12">اعتمده: {review.approved_by.name}</span>}
              {review.approved_at && <span className="text-muted fs-12" dir="ltr">{formatAbsolute(review.approved_at)}</span>}
              {review.note && <span className="text-muted fs-12">{review.note}</span>}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default LocationReviewEvidence;
