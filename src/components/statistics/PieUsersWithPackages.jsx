import { Component } from "react";
import ReactApexChart from "react-apexcharts";
import { Card } from "react-bootstrap";

export default class PieUsersWithPackages extends Component {
  constructor(props) {
    super(props);

    this.state = {
      series: [44, 55, 13],
      options: {
        chart: {
          height: 300,
          type: "pie",
          events: {
            mounted: (chart) => {
              chart.windowResizeHandler();
            },
          },
        },
        colors: ["var(--primary-color)", "var(--secondary-color)", "#4d5ddb"],
        labels: ["الباقة الألماسية", "الباقة الذهبية", "الباقة الفضية"],
        legend: {
          position: "bottom",
        },
        dataLabels: {
          dropShadow: {
            enabled: false,
          },
        },
      },
    };
  }

  render() {
    return (
      <Card className="custom-card">
        <Card.Header>
          <Card.Title>توزيع المشتركين بين الباقات</Card.Title>
        </Card.Header>
        <Card.Body>
          <div id="pie-basic">
            <ReactApexChart
              options={this.state.options}
              series={this.state.series}
              type="pie"
              height={370}
            />
          </div>
        </Card.Body>
      </Card>
    );
  }
}
