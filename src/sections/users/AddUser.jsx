import React, { Fragment } from "react";
import { PageHeader, Loader } from "../../components";
import { Helmet } from "react-helmet";
import { useSelector } from "react-redux";
import { Card, Col, Row } from "react-bootstrap";
const AddUser = () => {
  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Add User</title>
      </Helmet>
      <PageHeader
        homepage="اضافة مستخدم"
        activepage="المستخدمين"
        page="اضافة مستخدم"
      />

      <Row>
        <Col sm={4}>
          <Card className="custom-card m-0">
            <Card.Body>
              <Row>
                <Col>Coming Soon..</Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default AddUser;
