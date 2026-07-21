import { Component } from "react";
import ReactApexChart from "react-apexcharts";
import { Card } from "react-bootstrap";

export default class LineUsersWithPackages extends Component {
  constructor(props) {
    super(props);

    this.state = {
      series: [
        {
          type: "line",
          name: "الألماسية",
          data: [
            {
              x: "Jan",
              y: 100,
            },
            {
              x: "Feb",
              y: 210,
            },
            {
              x: "Mar",
              y: 180,
            },
            {
              x: "Apr",
              y: 454,
            },
            {
              x: "May",
              y: 230,
            },
            {
              x: "Jun",
              y: 320,
            },
            {
              x: "Jul",
              y: 656,
            },
            {
              x: "Aug",
              y: 830,
            },
            {
              x: "Sep",
              y: 350,
            },
            {
              x: "Oct",
              y: 350,
            },
            {
              x: "Nov",
              y: 210,
            },
            {
              x: "Dec",
              y: 410,
            },
          ],
        },
        {
          type: "line",
          name: "الذهبية",

          data: [
            {
              x: "Jan",
              y: 180,
            },
            {
              x: "Feb",
              y: 620,
            },
            {
              x: "Mar",
              y: 476,
            },
            {
              x: "Apr",
              y: 220,
            },
            {
              x: "May",
              y: 520,
            },
            {
              x: "Jun",
              y: 780,
            },
            {
              x: "Jul",
              y: 435,
            },
            {
              x: "Aug",
              y: 515,
            },
            {
              x: "Sep",
              y: 738,
            },
            {
              x: "Oct",
              y: 454,
            },
            {
              x: "Nov",
              y: 525,
            },
            {
              x: "Dec",
              y: 230,
            },
          ],
        },
        {
          type: "line",
          name: "الفضية",
          data: [
            {
              x: "Jan",
              y: 200,
            },
            {
              x: "Feb",
              y: 530,
            },
            {
              x: "Mar",
              y: 110,
            },
            {
              x: "Apr",
              y: 130,
            },
            {
              x: "May",
              y: 480,
            },
            {
              x: "Jun",
              y: 520,
            },
            {
              x: "Jul",
              y: 780,
            },
            {
              x: "Aug",
              y: 435,
            },
            {
              x: "Sep",
              y: 475,
            },
            {
              x: "Oct",
              y: 738,
            },
            {
              x: "Nov",
              y: 454,
            },
            {
              x: "Dec",
              y: 480,
            },
          ],
        },
      ],
      options: {
        chart: {
          events: {
            mounted: (chart) => {
              chart.windowResizeHandler();
            },
          },
          height: 350,
          animations: {
            speed: 500,
          },
        },
        colors: [
          "var(--primary-color)",
          "rgb(69, 214, 91)",
          "rgb(243, 156, 18)",
        ],
        dataLabels: {
          enabled: false,
        },
        grid: {
          borderColor: "#f1f1f1",
          strokeDashArray: 3,
        },
        stroke: {
          curve: "smooth",
          width: [1, 1, 1],
        },
        xaxis: {
          axisTicks: {
            show: false,
          },
        },
        yaxis: {
          labels: {
            formatter: function (value) {
              return value;
            },
          },
        },
        tooltip: {
          y: [
            {
              formatter: function (e) {
                return void 0 !== e ? "$" + e.toFixed(0) : e;
              },
            },
            {
              formatter: function (e) {
                return void 0 !== e ? "$" + e.toFixed(0) : e;
              },
            },
            {
              formatter: function (e) {
                return void 0 !== e ? e.toFixed(0) : e;
              },
            },
          ],
        },
        legend: {
          show: true,
          customLegendItems: ["الألماسية", "الذهبية", "الفضية"],
          position: "bottom",
          offsetX: 0,
          offsetY: 8,
          markers: {
            width: 5,
            height: 5,
            strokeWidth: 0,
            strokeColor: "#fff",
            fillColors: undefined,
            radius: 12,
            customHTML: undefined,
            onClick: undefined,
            offsetX: 0,
            offsetY: 0,
          },
        },
        title: {
          align: "left",
          style: {
            fontSize: ".8125rem",
            fontWeight: "semibold",
            color: "#8c9097",
          },
        },
        markers: {
          hover: {
            sizeOffset: 5,
          },
        },
      },
    };
  }

  render() {
    return (
      <div>
        <Card className="custom-card">
          <Card.Header className="justify-content-between">
            <div className="card-title">تطور عدد المشتركين في الباقات</div>
          </Card.Header>
          <Card.Body>
            <div className="content-wrapper">
              <ReactApexChart
                options={this.state.options}
                series={this.state.series}
                type="line"
                height={350}
              />
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
}
