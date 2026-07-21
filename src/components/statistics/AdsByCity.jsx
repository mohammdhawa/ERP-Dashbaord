import ReactApexChart from "react-apexcharts";
import { useEffect, useState } from "react";
import api from "../../redux/api";

const AdsByCity = () => {
  const [chartData, setChartData] = useState({ cities: [], counts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdsByCity();
  }, []);

  const fetchAdsByCity = async () => {
    try {
      setLoading(true);
      const response = await api.get("/dashboard/charts/ads-by-cities");
      
      const data = response.data.data;
      const cities = data.map(item => item.city);
      const counts = data.map(item => item.count);
      
      setChartData({ cities, counts });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching ads by city:", error);
      setLoading(false);
    }
  };

  const series = [
    {
      name: "إعلان",
      data: chartData.counts,
    },
  ];

  const options = {
    chart: {
      height: 412,
      type: "line",
      events: {
        mounted: (chart) => {
          chart.windowResizeHandler();
        },
        click: function () {},
      },
      toolbar: {
        show: false,
      },
    },
    colors: [
      "var(--primary-color)",
      "rgb(69, 214, 91)",
      "rgb(243, 156, 18)",
      "rgb(52, 152, 219)",
      "rgb(46, 204, 113)",
      "rgb(231, 76, 60)",
      "rgb(0, 177, 163)",
      "rgb(255, 116, 23)",
    ],
    plotOptions: {
      bar: {
        barHeight: "10%",
        distributed: true,
        horizontal: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    grid: {
      borderColor: "#f1f1f1",
      strokeDashArray: 3,
    },
    xaxis: {
      categories: chartData.cities.map(city => [city]),
      labels: {
        show: false,
        offsetX: 30,
        offsetY: 30,
        style: {
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        show: true,
        style: {
          colors: "#8c9097",
          fontSize: "14px",
          fontWeight: 400,
          cssClass: "apexcharts-yaxis-label",
        },
        offsetY: 8,
      },
    },
    tooltip: {
      enabled: true,
      shared: false,
      intersect: true,
      x: {
        show: false,
      },
    },
  };

  if (loading) {
    return <div className="text-center py-5">جاري التحميل...</div>;
  }

  return (
    <div>
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height={412}
      />
    </div>
  );
};

export default AdsByCity;
