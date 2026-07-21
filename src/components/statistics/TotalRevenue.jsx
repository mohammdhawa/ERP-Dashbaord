import { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import api from "../../redux/api";

const TotalRevenue = ({ period = "month" }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard/charts/revenue?period=${period}`);
      
      // Transform API data to ApexCharts format
      const formattedData = response.data.data.map(item => [
        new Date(item.date).getTime(),
        parseFloat(item.revenue)
      ]);
      
      setChartData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching revenue chart data:", error);
      setLoading(false);
    }
  };

  const series = [
    {
      name: "الإيرادات",
      data: chartData,
    },
  ];

  const options = {
    chart: {
      events: {
        mounted: (chart) => {
          chart.windowResizeHandler();
        },
      },
      type: "area",
      fontFamily: "Poppins, Arial, sans-serif",
      foreColor: "#8c9097",
      height: 260,
      zoom: {
        autoScaleYaxis: true,
      },
      toolbar: {
        show: false,
      },
      stacked: true,
    },
    grid: {
      borderColor: "#edeef1",
      strokeDashArray: 2,
    },
    colors: ["var(--primary-color)"],
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 0,
    },
    stroke: {
      width: 1,
      curve: "smooth",
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.5,
        opacityTo: 0.3,
        colorStops: [
          [
            {
              offset: 0,
              color: "var(--primary02)",
              opacity: 50,
            },
            {
              offset: 75,
              color: "var(--primary02)",
              opacity: 0.1,
            },
            {
              offset: 100,
              color: "transparent",
              opacity: 0.1,
            },
          ],
        ],
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
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
    xaxis: {
      type: "datetime",
      tickAmount: 6,
      axisBorder: {
        show: false,
      },
      crosshairs: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: "10px",
        },
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "10px",
        },
      },
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
    },
  };

  if (loading) {
    return <div className="text-center py-5">جاري التحميل...</div>;
  }

  return (
    <div id="chart-months">
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={260}
      />
    </div>
  );
};

export default TotalRevenue;