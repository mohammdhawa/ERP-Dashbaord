import React from "react";
import { Card, Col, Row } from "react-bootstrap";

const NoInternetConnection = () => {
  return (
    <div
      style={{
        position: "fixed",
        background: "transparent",
        bottom: "2rem",
        left: "0rem",
        right:"0rem",
        zIndex: "100000",
        display:"flex",
        alignItems:"center",
        justifyContent:"center"
      }}
    >
      <div className="bg-dark text-light d-flex justify-content-center align-items-center p-4 gap-3 rounded">
        <div className="bg-light text-center p-3 rounded-2" style={{height:"5rem",width:"5rem"}} >
          <i className="ri ri-wifi-off-line fs-2 text-primary" />
        </div>
        <div className="d-flex align-items-start flex-column gap-1">
          <p className="m-0 fw-bold fs-5">لا يوجد اتصال بالإنترنت!</p>
          <p className="m-0 fs-16">
            يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoInternetConnection;
