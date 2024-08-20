
const submitButton = document.querySelector('#queryBtn');
const promptInput = document.querySelector('#prompt');
const barPieToggle = document.querySelector('#barOrPie');
const graphHeader = document.querySelector('#graphHeading');
const downloadButton = document.querySelector('#downloadBtn');
let csvToVisualize;
let fileName;
submitButton.addEventListener('click', () => {
  document.querySelector('#chart').innerHTML = '';
  const userInput = promptInput.value;
  console.log('Prompt', userInput);
  graphHeader.textContent = userInput;
  fileName = userInput;
  csvGenerator(userInput);
});
let chartType = "bar";
barPieToggle.addEventListener('click', () => {
  chartType = chartType === "bar" ? "pie" : "bar";
  document.querySelector('#chart').innerHTML = '';
  if (csvToVisualize) {
    generateChart(csvToVisualize, chartType);
  }
  else{
    console.log('No CSV to visualize');
  }
});
async function generateChart(csvData, type) {
  // Parse CSV data
  const rawData = d3.csvParse(csvData);

  // Identify columns in the data
  const columns = Object.keys(rawData[0]);

  if (columns.length < 2) {
    console.error("CSV data must contain at least two columns.");
    return;
  }

  // Assume the first column is the category and the second is the value
  const categoryColumn = columns[0]; // Change if needed
  const valueColumn = columns[1]; // Change if needed

  const maxValue = d3.max(rawData, d => +d[valueColumn]);

  // Process data for the chart
  const data = rawData.map(d => ({
    category: d[categoryColumn],
    value: isNaN(+d[valueColumn]) ? 0 : +d[valueColumn]
  }));

  // Increase the width and adjust margins
  const width = 800; // Increased from 600
  const height = 500; // Increased from 450
  const margin = { top: 20, right: 150, bottom: 100, left: 150 }; // Increased right and left margins

  // Create SVG container
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  if (type === 'pie') {
    // Pie chart
    const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2 * 0.8; // Increased from 0.6
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);
    const arc = d3.arc()
      .outerRadius(radius * 0.8)
      .innerRadius(radius * 0.4);

    const outerArc = d3.arc()
      .innerRadius(radius * 1.1)
      .outerRadius(radius * 1.1);

    svg.attr("transform", `translate(${width / 2},${height / 2})`);

    const arcs = svg.selectAll("arc")
      .data(pie(data))
      .enter().append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.category));

    // Prepare label positions
    const labelLayout = d3.forceSimulation(data)
      .force('charge', d3.forceManyBody().strength(50))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(20));

    labelLayout.tick(100);

    // Add polylines
    const polyline = arcs.append("polyline")
      .attr("stroke", "black")
      .attr("fill", "none")
      .attr("stroke-width", 1)
      .attr("points", function(d, i) {
        const pos = outerArc.centroid(d);
        pos[0] = radius * 1.5 * (midAngle(d) < Math.PI ? 1 : -1);
        return [arc.centroid(d), outerArc.centroid(d), pos];
      });

    // Adjust label positioning
    const label = arcs.append("text")
      .attr("dy", ".35em")
      .html(function(d) {
        return d.data.category;
      })
      .attr("transform", function(d, i) {
        const pos = outerArc.centroid(d);
        pos[0] = radius * 1.8 * (midAngle(d) < Math.PI ? 1 : -1); // Increased from 1.6
        return `translate(${pos[0] + data[i].x},${pos[1] + data[i].y})`;
      })
      .style("text-anchor", function(d) {
        return midAngle(d) < Math.PI ? 'start' : 'end';
      });

    // Helper function to compute the angle at the middle of an arc
    function midAngle(d) {
      return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }
  } else if (type === 'bar') {
    // Bar graph
    const x = d3.scaleBand()
      .domain(data.map(d => d.category))
      .range([0, width - margin.left - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)]).nice()
      .range([height - margin.top - margin.bottom, 0]);

    // Format function for large numbers
    const formatNumber = d3.format(".2s");

    // Color scale for bars
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw bars
    svg.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.category))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => (height - margin.top - margin.bottom) - y(d.value))
      .attr("fill", (d, i) => colorScale(i)); // Use colorScale to assign different colors

    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");

    // Add Y axis with formatted labels
    svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d => formatNumber(d)));
  } else {
    console.error("Invalid chart type. Please use 'pie' or 'bar'.");
    return;
  }

  // Add this at the end of the function to ensure the SVG fits its container
  svg.attr("viewBox", `0 0 ${width} ${height}`)
     .attr("preserveAspectRatio", "xMidYMid meet");
}


downloadButton.addEventListener('click', () => {
  downloadChart();
});

function downloadChart() {
  const svg = document.querySelector('#chart svg');
  if (!svg) {
    console.log('No graph generated yet');
    return;
  }
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const pngFile = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = fileName;
    downloadLink.href = pngFile;
    downloadLink.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
}
// Add an event listener for when the DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if the current URL doesn't already have a hash
  if (!window.location.hash) {
    // If there's no hash, redirect to '/?#'
    window.location.href = '/?#';
  }
});



async function csvGenerator(userText) {
  const prompt = "Give output in only this csv format. 'String, Number\n' and do not include anything else in the response." + userText + "Give only plain CSV without headers and do not generate markdown";

  try {
    const response = await fetch('/api/generate-csv?prompt=' + encodeURIComponent(prompt));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.text();
    if (data) {
      // Remove outer quotes and convert \n to actual newlines
      let csvData = data.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
      // Add header row
      const headers = 'Row, Column\n';

      // Process the CSV data
      csvData = csvData.split('\n').map(row => {
        let [rowName, columnValue] = row.split(',');
        // Remove extra quotes and backslashes from rowName
        rowName = rowName.replace(/^\\?"?|\\?"?$/g, '').trim();
        if (columnValue) {
          columnValue = parseInt(columnValue.replace('%', '').trim(), 10);
        }
        return `${rowName},${columnValue}`;
      }).join('\n');

      csvData = headers + csvData;
      csvToVisualize = csvData;
      console.log(csvData);
      generateChart(csvData, chartType);
    } else {
      console.error('Error: Empty response from server');
      document.querySelector('#chart').innerHTML = `<p>Error generating chart: Empty response from server</p>`;
    }
  } catch (error) {
    console.error('Error fetching CSV data:', error.message);
    document.querySelector('#chart').innerHTML = `<p>Error generating chart: ${error.message}</p>`;
  }
}