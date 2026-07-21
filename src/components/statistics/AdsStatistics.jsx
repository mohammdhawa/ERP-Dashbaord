import ReactApexChart from "react-apexcharts";
import { useEffect, useState } from "react";
import api from "../../redux/api";

const AdsStatistics = ({ period = "month" }) => {
  const [chartData, setChartData] = useState({ series: [], categories: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdStatistics();
  }, [period]);

  const fetchAdStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard/charts/ad-statistics?period=${period}`);
      
      // Transform API data to ApexCharts format
      const data = response.data.data;
      const categoryIds = Object.keys(data);
      
      // Get all unique time periods first to ensure consistent x-axis
      const allPeriods = new Set();
      categoryIds.forEach(categoryId => {
        const categoryInfo = data[categoryId];
        if (categoryInfo && categoryInfo.data && Array.isArray(categoryInfo.data)) {
          categoryInfo.data.forEach(item => {
            if (period === "month") {
              allPeriods.add(item.month);
            } else if (period === "year") {
              allPeriods.add(item.year);
            } else if (period === "week") {
              allPeriods.add(item.week);
            }
          });
        }
      });

      const sortedPeriods = Array.from(allPeriods).sort();

      // Create series for each category with consistent data points
      const series = categoryIds.map(categoryId => {
        const categoryInfo = data[categoryId];
        
        if (!categoryInfo || !categoryInfo.data || !Array.isArray(categoryInfo.data)) {
          return {
            name: categoryInfo?.category_name || `Category ${categoryId}`,
            data: new Array(sortedPeriods.length).fill(null)
          };
        }
        
        // Create a map of period -> count for this category
        const periodCountMap = {};
        categoryInfo.data.forEach(item => {
          let periodKey;
          if (period === "month") {
            periodKey = item.month;
          } else if (period === "year") {
            periodKey = item.year;
          } else if (period === "week") {
            periodKey = item.week;
          }
          periodCountMap[periodKey] = item.count;
        });
        
        // Create data array aligned with sortedPeriods
        const alignedData = sortedPeriods.map(periodKey => periodCountMap[periodKey] || 0);
        
        return {
          name: categoryInfo.category_name,
          data: alignedData
        };
      });
      
      // Extract dates for categories (x-axis) based on period
      let categories = [];
      if (sortedPeriods.length > 0) {
        if (period === "week") {
          // For weekly data, show week numbers
          categories = sortedPeriods.map(periodKey => `الأسبوع ${periodKey || 'N/A'}`);
        } else if (period === "month") {
          // For monthly data, show month names
          const monthNames = [
            "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
            "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
          ];
          categories = sortedPeriods.map(periodKey => monthNames[periodKey - 1] || `شهر ${periodKey}`);
        } else if (period === "year") {
          // For yearly data, show years
          categories = sortedPeriods.map(periodKey => periodKey.toString());
        }
      }
      
      setChartData({ series, categories });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching ad statistics:", error);
      setLoading(false);
    }
  };

  const series = chartData.series;

  const options = {
    chart: {
      events: {
        mounted: (chart) => {
          chart.windowResizeHandler();
        },
      },
      type: "line",
      height: 318,
      toolbar: {
        show: false,
      },
      stacked: false,
    },
    colors: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"],
    fill: {
      type: "solid",
      opacity: 0.1,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: true,
      position: "top",
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
    stroke: {
      curve: "smooth",
      width: 3,
      lineCap: "round",
    },
    grid: {
      borderColor: "#edeef1",
      strokeDashArray: 2,
    },
    yaxis: {
      axisBorder: {
        show: true,
        color: "rgba(119, 119, 142, 0.05)",
        offsetX: 0,
        offsetY: 0,
      },
      axisTicks: {
        color: "rgba(119, 119, 142, 0.05)",
        width: 6,
        offsetX: 0,
        offsetY: 0,
      },
      labels: {
        formatter: function (y) {
          return y.toFixed(0) + "";
        },
      },
    },
    xaxis: {
      categories: chartData.categories,
      axisBorder: {
        show: false,
        color: "rgba(119, 119, 142, 0.05)",
        offsetX: 0,
        offsetY: 0,
      },
      axisTicks: {
        show: false,
        borderType: "solid",
        color: "rgba(119, 119, 142, 0.05)",
        offsetX: 0,
        offsetY: 0,
      },
      labels: {
        rotate: -90,
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
        type="line"
        height={318}
      />
    </div>
  );
};

export default AdsStatistics;