import React, { Fragment, useEffect, useState } from "react";
import { Card, Col, OverlayTrigger, Popover, Tooltip } from "react-bootstrap";
import { permissionsColumns } from "../../data/Columns";
import { useSelector } from "react-redux";
import { DataTable, TablePagination } from "../../components";
import { ShowPerPage } from "../../data/General";
import Select from "react-select";
import DetailPermissionModal from "./DetailPermissionModal";
import ALLImages from "../../data/Imagedata";
const Permissions = () => {
  const { permissions } = useSelector((state) => state.permissions);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [detailModalShow, setDetailModalShow] = useState(false);
  const [showingPermisssion, setShowingPermisson] = useState(null);

  useEffect(() => {
    setFilteredData(permissions);
  }, [permissions]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredData(permissions);
    } else {
      const filtered = permissions.filter((permission) => {
        const permissionId = String(permission.id).toLowerCase();
        return (
          permissionId.includes(searchQuery.toLowerCase()) ||
          permission.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });

      setFilteredData(filtered);
    }
  }, [searchQuery, permissions]);
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  const handleShowDetails = (perm) => {
    setShowingPermisson(perm);
    setDetailModalShow(true);
  };
  return (
    <Fragment>
      <Card className="custom-card">
        <Card.Header>
          <div
            className={`alert col alert-info svg-black d-flex justify-content-between gap-4 align-items-center fs-14`}
            role="alert"
          >
            <div className="d-flex align-items-start">
              <i className="ri-info-i me-2"></i>
              <div>
                الصلاحيات في النظام ثابتة ويمكن تعيينها للأدوار فقط، ولا يمكن
                تعديلها أو حذفها أو إضافة صلاحيات جديدة. يتم تحديدها بناءً على
                الميزات المتاحة في النظام.
              </div>
            </div>
            <OverlayTrigger
              trigger="click"
              placement="bottom"
              overlay={
                <Popover
                  className="popover-light only-body "
                  id="popover-basic"
                >
                  <Popover.Body className="p-2">
                    لإضافة ميزات أو صلاحيات جديدة، يرجى التواصل مع الشركة
                    المطورة.
                  </Popover.Body>
                </Popover>
              }
            >
              <img
                src={ALLImages("upgradeStars")}
                style={{
                  width: "1.3rem",
                  cursor: "pointer",
                  transform: "rotate(180deg) scaleX(-1)",
                }}
              />
            </OverlayTrigger>
          </div>
        </Card.Header>
        <div className="row flex-wrap gx-2 gy-2 p-3 justify-content-between align-items-center">
          <Col md={8} lg={8} xl={3} xxl={2}>
            <input
              className="form-control"
              type="text"
              placeholder="ابحث.."
              onChange={handleSearch}
            />
          </Col>
          <Col md={4} lg={4} xl={2} xxl={1}>
            <Select
              options={ShowPerPage}
              placeholder={`عرض ${itemsPerPage}`}
              aria-label="Show Per Page"
              classNamePrefix="Select2"
              className=""
              defaultValue={{ label: itemsPerPage, value: itemsPerPage }}
              onChange={(e) => setItemsPerPage(e.value)}
              value={{ label: `عرض ${itemsPerPage}`, value: itemsPerPage }}
            />
          </Col>
        </div>
        <Card.Body>
          <DataTable
            data={filteredData}
            columns={permissionsColumns}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            functions={{
              handleDetail: handleShowDetails,
            }}
          />
        </Card.Body>
      </Card>
      <DetailPermissionModal
        open={detailModalShow}
        close={() => {
          setDetailModalShow(!detailModalShow);
        }}
        permission={showingPermisssion}
      />
    </Fragment>
  );
};

export default Permissions;
