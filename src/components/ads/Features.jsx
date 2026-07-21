import { ListGroupItem } from "react-bootstrap";
import {
  colors,
  transmissionTypes,
  fuelTypes,
  motorcycleTypes,
  coolingTypes,
  marineTypes,
  conditionTypes,
} from "../../data/General";

const getColorLabel = (colorValue) => {
  const color = colors.find((c) => c.value === colorValue);
  return color ? color.label : "غير محدد";
};
const getTransmissionLabel = (transmissionValue) => {
  const transmission = transmissionTypes.find(
    (t) => t.value === transmissionValue
  );
  return transmission ? transmission.label : "غير محدد";
};

const getFuelTypeLabel = (fuelTypeValue) => {
  const fuelType = fuelTypes.find((f) => f.value === fuelTypeValue);
  return fuelType ? fuelType.label : "غير محدد";
};

const getMotorcycleTypeLabel = (motorcycleTypeValue) => {
  const motorcycleType = motorcycleTypes.find(
    (m) => m.value === motorcycleTypeValue
  );
  return motorcycleType ? motorcycleType.label : "غير محدد";
};

const getCoolingTypeLabel = (coolingTypeValue) => {
  const coolingType = coolingTypes.find((c) => c.value === coolingTypeValue);
  return coolingType ? coolingType.label : "غير محدد";
};

const getMarineTypeLabel = (marineTypeValue) => {
  const marineType = marineTypes.find((m) => m.value === marineTypeValue);
  return marineType ? marineType.label : "غير محدد";
};

const getConditionLabel = (conditionValue) => {
  const condition = conditionTypes.find((c) => c.value === conditionValue);
  return condition ? condition.label : "غير محدد";
};

const FeatureBadge = ({ icon, title, value }) => {
  const displayValue =
    value !== null && value !== undefined && value !== "" ? value : "غير معروف";
  return (
    <ListGroupItem className="px-2 py-0 border-0">
      <div className="d-flex gap-3 align-items-center p-2 rounded-2">
        <span className="avatar avatar-lg bg-light text-primary rounded-2">
          <i className={`${icon} fs-4 p-3 align-middle p-0`} />
        </span>
        <div className="d-flex flex-column">
          <span className="text-muted">{title}</span>
          <p className="m-0 fw-bolder">{displayValue}</p>
        </div>
      </div>
    </ListGroupItem>
  );
};

const createFeatureBadge = (icon, title, value) => (
  <FeatureBadge icon={icon} title={title} value={value} />
);

const LandFeatures = ({ ad }) => {
  const { landAdvertisement_details } = ad || {};
  return createFeatureBadge(
    "bx bx-area",
    "مساحة الأرض",
    `${landAdvertisement_details?.square_meters}م²`
  );
};
const MarineFeatures = ({ ad }) => {
  const { vehicleAdvertisement_details, marineAdvertisement_details } =
    ad || {};
  return (
    <>
      {createFeatureBadge(
        "ri-ship-2-line",
        "الماركة",
        vehicleAdvertisement_details?.brand?.name
      )}
      {createFeatureBadge(
        "bx bx-category-alt",
        "الموديل",
        vehicleAdvertisement_details?.model?.name
      )}
      {createFeatureBadge(
        "ri-ship-line",
        "الفئة",
        getMarineTypeLabel(marineAdvertisement_details?.marine_type)
      )}
      {createFeatureBadge(
        "ri-calendar-line",
        "سنة الإصدار",
        vehicleAdvertisement_details?.year
      )}
      {createFeatureBadge(
        "ri-sparkling-line",
        "الحالة",
        getConditionLabel(vehicleAdvertisement_details?.condition)
      )}
      {createFeatureBadge(
        "bx bxs-color",
        "اللون",
        getColorLabel(vehicleAdvertisement_details?.color)
      )}
      {createFeatureBadge(
        "ti ti-manual-gearbox",
        "نوع الغيار",
        getTransmissionLabel(vehicleAdvertisement_details?.transmission_type)
      )}
      {createFeatureBadge(
        "bx bx-cylinder",
        "اسطوانات المحرك",
        vehicleAdvertisement_details?.cylinders
      )}
      {createFeatureBadge(
        "ti ti-engine",
        "سعة المحرك",
        vehicleAdvertisement_details?.engine_capacity
      )}
      {createFeatureBadge(
        "ri-omega",
        "القوة الحصانية",
        vehicleAdvertisement_details?.horsepower
      )}
      {createFeatureBadge(
        "ri-gas-station-line",
        "نوع الوقود",
        getFuelTypeLabel(vehicleAdvertisement_details?.fuel_type)
      )}
      {createFeatureBadge(
        "ri-speed-up-line",
        "كيلومتراج",
        `${vehicleAdvertisement_details?.mileage}كم`
      )}
      {createFeatureBadge(
        "bi bi-arrows",
        "طول المركب",
        `${marineAdvertisement_details?.length}م`
      )}
      {createFeatureBadge(
        "ri-group-line",
        "السعة القصوى",
        marineAdvertisement_details?.max_capacity
      )}
    </>
  );
};
const MotorFeatures = ({ ad }) => {
  const { vehicleAdvertisement_details, motorcycleAdvertisement_details } =
    ad || {};
  return (
    <>
      {createFeatureBadge(
        "ri-motorbike-line",
        "الماركة",
        vehicleAdvertisement_details?.brand?.name
      )}
      {createFeatureBadge(
        "bx bx-category-alt",
        "الموديل",
        vehicleAdvertisement_details?.model?.name
      )}
      {createFeatureBadge(
        "ri-key-line",
        "نوع الدراجة",
        getMotorcycleTypeLabel(motorcycleAdvertisement_details?.motorcycle_type)
      )}
      {createFeatureBadge(
        "ri-calendar-line",
        "سنة الإصدار",
        vehicleAdvertisement_details?.year
      )}
      {createFeatureBadge(
        "bx bxs-color",
        "اللون",
        getColorLabel(vehicleAdvertisement_details?.color)
      )}
      {createFeatureBadge(
        "bi bi-boxes",
        "نوع التبريد",
        getCoolingTypeLabel(motorcycleAdvertisement_details?.cooling_type)
      )}
      {createFeatureBadge(
        "ri-sparkling-line",
        "الحالة",
        getConditionLabel(vehicleAdvertisement_details?.condition)
      )}
      {createFeatureBadge(
        "ti ti-manual-gearbox",
        "نوع الغيار",
        getTransmissionLabel(vehicleAdvertisement_details?.transmission_type)
      )}
      {createFeatureBadge(
        "bx bx-cylinder",
        "اسطوانات المحرك",
        vehicleAdvertisement_details?.cylinders
      )}
      {createFeatureBadge(
        "ti ti-engine",
        "سعة المحرك",
        vehicleAdvertisement_details?.engine_capacity
      )}
      {createFeatureBadge(
        "ri-omega",
        "القوة الحصانية",
        vehicleAdvertisement_details?.horsepower
      )}
      {createFeatureBadge(
        "ri-gas-station-line",
        "نوع الوقود",
        getFuelTypeLabel(vehicleAdvertisement_details?.fuel_type)
      )}
      {createFeatureBadge(
        "ri-speed-up-line",
        "كيلومتراج",
        `${vehicleAdvertisement_details?.mileage}كم`
      )}
    </>
  );
};

const CarFeatures = ({ ad }) => {
  const { vehicleAdvertisement_details, carAdvertisement_details } = ad || {};
  return (
    <>
      {createFeatureBadge(
        "ri-roadster-line",
        "الماركة",
        vehicleAdvertisement_details?.brand?.name
      )}
      {createFeatureBadge(
        "bx bx-category-alt",
        "الموديل",
        vehicleAdvertisement_details?.model?.name
      )}
      {createFeatureBadge(
        "ri-calendar-line",
        "سنة الإصدار",
        vehicleAdvertisement_details?.year
      )}
      {createFeatureBadge(
        "bx bxs-color",
        "اللون الخارجي",
        getColorLabel(vehicleAdvertisement_details?.color)
      )}
      {createFeatureBadge(
        "ri-palette-line",
        "لون المقاعد",
        getColorLabel(carAdvertisement_details?.seats_color)
      )}
      {createFeatureBadge(
        "ri-sofa-line",
        "عدد المقاعد",
        carAdvertisement_details?.seats
      )}
      {createFeatureBadge(
        "ri-key-line",
        "عدد الابواب",
        carAdvertisement_details?.doors
      )}
      {createFeatureBadge(
        "ri-sparkling-line",
        "الحالة",
        getConditionLabel(vehicleAdvertisement_details?.condition)
      )}
      {createFeatureBadge(
        "ti ti-manual-gearbox",
        "نوع الغيار",
        getTransmissionLabel(vehicleAdvertisement_details?.transmission_type)
      )}
      {createFeatureBadge(
        "bx bx-cylinder",
        "اسطوانات المحرك",
        vehicleAdvertisement_details?.cylinders
      )}
      {createFeatureBadge(
        "ti ti-engine",
        "سعة المحرك",
        vehicleAdvertisement_details?.engine_capacity
      )}
      {createFeatureBadge(
        "ri-omega",
        "القوة الحصانية",
        vehicleAdvertisement_details?.horsepower
      )}
      {createFeatureBadge(
        "ri-gas-station-line",
        "نوع الوقود",
        getFuelTypeLabel(vehicleAdvertisement_details?.fuel_type)
      )}
      {createFeatureBadge(
        "ri-speed-up-line",
        "كيلومتراج",
        `${vehicleAdvertisement_details?.mileage}كم`
      )}
    </>
  );
};

const HouseFeatures = ({ ad }) => {
  const { houseAdvertisement_details } = ad || {};
  return (
    <>
      {createFeatureBadge(
        "bx bx-area",
        "المساحة الكلية",
        `${houseAdvertisement_details?.square_meters}م²`
      )}
      {createFeatureBadge(
        "bx bx-bed",
        "عدد الغرف",
        houseAdvertisement_details?.number_of_rooms
      )}
      {createFeatureBadge(
        "bx bx-bath",
        "عدد الحمامات",
        houseAdvertisement_details?.number_of_bathrooms
      )}
      {createFeatureBadge(
        "ri-building-2-line",
        "عمر البناء",
        houseAdvertisement_details?.building_age
      )}
      {createFeatureBadge(
        "ri-stacked-view",
        "الطابق",
        houseAdvertisement_details?.floor
      )}
    </>
  );
};

export {
  LandFeatures,
  MarineFeatures,
  MotorFeatures,
  HouseFeatures,
  CarFeatures,
  FeatureBadge,
};
