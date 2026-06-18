import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const formatValue = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(digits);

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue) && value !== true && value !== false) {
    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(digits);
  }

  return String(value);
};

const addTable = (doc, title, head, rows, startY) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const nextY = startY > pageHeight - 35 ? 18 : startY;

  if (nextY !== startY) doc.addPage();

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, nextY);

  autoTable(doc, {
    startY: nextY + 5,
    head: [head],
    body: rows.length ? rows : [["No data available", ...head.slice(1).map(() => "")]],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  return doc.lastAutoTable.finalY + 10;
};

const filtersToRows = (filters) => [
  ["Age Range", `${filters?.ageRange?.[0] ?? "N/A"} to ${filters?.ageRange?.[1] ?? "N/A"}`],
  ["Gender", filters?.genders?.length ? filters.genders.join(", ") : "All"],
  ["Education", filters?.educationLevels?.length ? filters.educationLevels.join(", ") : "All"],
];

export const exportDataExplorerReport = ({
  dataSource,
  filters,
  filteredCount,
  totalCount,
  demographicsData,
  ocdAnalysisData,
  correlationData,
}) => {
  const doc = new jsPDF();
  const reportDate = new Date();
  const sourceLabel = dataSource === "research" ? "Research Dataset" : "My Patients";

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Compulysis Data Explorer Report", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${reportDate.toLocaleString()}`, 14, 26);
  doc.text(`Data Source: ${sourceLabel}`, 14, 32);

  let y = addTable(
    doc,
    "Overview",
    ["Field", "Value"],
    [
      ["Records in Report", formatValue(filteredCount, 0)],
      ["Total Records Available", formatValue(totalCount, 0)],
      ["Source", sourceLabel],
    ],
    42
  );

  y = addTable(doc, "Applied Filters", ["Filter", "Value"], filtersToRows(filters), y);

  y = addTable(
    doc,
    "Age Distribution by Risk",
    ["Age Group", "Low Risk", "Moderate Risk", "High Risk"],
    (demographicsData?.ageDistribution || []).map((item) => [
      item.ageGroup,
      formatValue(item["Low Risk"], 0),
      formatValue(item["Moderate Risk"], 0),
      formatValue(item["High Risk"], 0),
    ]),
    y
  );

  y = addTable(
    doc,
    "Gender Distribution",
    ["Gender", "Count"],
    (demographicsData?.genderDistribution || []).map((item) => [
      item.name,
      formatValue(item.value, 0),
    ]),
    y
  );

  y = addTable(
    doc,
    "Risk by Gender",
    ["Gender", "Low", "Moderate", "High", "Average Risk"],
    (demographicsData?.riskByGender || []).map((item) => [
      item.gender,
      formatValue(item.low, 0),
      formatValue(item.moderate, 0),
      formatValue(item.high, 0),
      formatValue(item.avgRisk),
    ]),
    y
  );

  y = addTable(
    doc,
    "OCD Dimension Scores by Risk",
    ["Dimension", "Low Risk", "Moderate Risk", "High Risk"],
    (ocdAnalysisData?.dimensionsByRisk || []).map((item) => [
      item.dimension,
      formatValue(item["Low Risk"]),
      formatValue(item["Moderate Risk"]),
      formatValue(item["High Risk"]),
    ]),
    y
  );

  y = addTable(
    doc,
    "Average OCD Dimension Profile",
    ["Dimension", "Average Score"],
    (ocdAnalysisData?.averageProfile || []).map((item) => [
      item.dimension,
      formatValue(item.score),
    ]),
    y
  );

  y = addTable(
    doc,
    "Most Concerning Dimensions",
    ["Dimension", "Average Score", "Individuals Affected"],
    (ocdAnalysisData?.topConcerningDimensions || []).map((item) => [
      item.dimension,
      formatValue(item.avgScore),
      formatValue(item.count, 0),
    ]),
    y
  );

  y = addTable(
    doc,
    "Dimension Correlation with OCD Risk",
    ["Dimension", "Correlation"],
    (ocdAnalysisData?.dimensionCorrelations || []).map((item) => [
      item.dimension,
      formatValue(item.correlation, 3),
    ]),
    y
  );

  addTable(
    doc,
    "Strongest Correlations",
    ["Feature 1", "Feature 2", "Correlation"],
    (correlationData?.topCorrelations || []).map((item) => [
      item.feature1,
      item.feature2,
      formatValue(item.correlation, 3),
    ]),
    y
  );

  const filenameDate = reportDate.toISOString().slice(0, 10);
  const filenameSource = dataSource === "research" ? "research-dataset" : "my-patients";
  doc.save(`compulysis-data-explorer-${filenameSource}-${filenameDate}.pdf`);
};
