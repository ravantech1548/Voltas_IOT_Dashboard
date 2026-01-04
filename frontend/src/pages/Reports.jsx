import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../utils/api';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [sensors, setSensors] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [shifts, setShifts] = useState([]);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('today'); // today, lastweek, currentmonth, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('all'); // all, 1, 2, 3, etc.
  
  useEffect(() => {
    fetchSensors();
    fetchShifts();
  }, []);

  useEffect(() => {
    if (sensors.length > 0) {
      fetchReportData();
    }
  }, [sensors, dateFilter, startDate, endDate, startTime, endTime, selectedShiftId]);

  const fetchSensors = async () => {
    try {
      const response = await api.get('/sensors');
      // Filter for Switch type sensors only
      const switchSensors = response.data
        .filter(s => {
          const sensorType = s.sensor_type?.toLowerCase() || '';
          return sensorType === 'switch' && s.status === 'active';
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setSensors(switchSensors);
      console.log(`📊 Loaded ${switchSensors.length} switch sensors for reports`);
    } catch (error) {
      console.error('Error fetching sensors:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shifts');
      setShifts(response.data.filter(s => s.is_active));
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let start, end;

    switch (dateFilter) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastweek':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'currentmonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          return null;
        }
        break;
      default:
        return null;
    }

    return { start, end };
  };

  // Filter data by shift hours
  const filterDataByShift = (data, shift) => {
    if (!shift || !shift.start_time || !shift.end_time) return data;

    const startTime = shift.start_time.slice(0, 5); // HH:mm
    const endTime = shift.end_time.slice(0, 5); // HH:mm

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const isOvernight = endMinutes <= startMinutes;

    return data.filter(point => {
      const time = new Date(point.timestamp);
      const hour = time.getHours();
      const min = time.getMinutes();
      const pointMinutes = hour * 60 + min;

      if (isOvernight) {
        return pointMinutes >= startMinutes || pointMinutes <= endMinutes;
      } else {
        return pointMinutes >= startMinutes && pointMinutes <= endMinutes;
      }
    });
  };

  const fetchReportData = async () => {
    if (sensors.length === 0) return;

    setLoading(true);
    try {
      const dateRange = getDateRange();
      if (!dateRange) {
        setReportData([]);
        setLoading(false);
        return;
      }

      let { start, end } = dateRange;

      // Apply time filter if provided
      if (startTime) {
        const [hour, min] = startTime.split(':').map(Number);
        start.setHours(hour, min, 0, 0);
      }
      if (endTime) {
        const [hour, min] = endTime.split(':').map(Number);
        end.setHours(hour, min, 59, 999);
      }

      console.log(`📊 Fetching report data from ${start.toISOString()} to ${end.toISOString()}`);

      // Fetch data for all sensors
      const allDataPromises = sensors.map(sensor =>
        api.get(`/data/sensor/${sensor.id}`, {
          params: {
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            limit: 50000 // Large limit to get all records
          }
        }).catch(err => {
          console.error(`Error fetching data for ${sensor.name}:`, err);
          return { data: [] };
        })
      );

      const allResponses = await Promise.all(allDataPromises);

      // Combine all sensor data into timeline format
      const dataMap = new Map();

      sensors.forEach((sensor, sensorIndex) => {
        const sensorData = allResponses[sensorIndex].data || [];
        console.log(`📊 Fetched ${sensorData.length} records for ${sensor.name}`);
        sensorData.forEach((item, itemIndex) => {
          const time = new Date(item.timestamp);
          // Use timestamp as key to preserve all records (with milliseconds precision)
          const timeKey = time.getTime().toString(); // Use timestamp in milliseconds for unique key

          if (!dataMap.has(timeKey)) {
            dataMap.set(timeKey, {
              timestamp: time,
              date: time.toISOString().split('T')[0],
              time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`,
              liveStatus: null // Will be set from data_status field
            });
            // Initialize all sensors to null
            sensors.forEach(s => {
              dataMap.get(timeKey)[s.name] = null;
            });
          }

          const point = dataMap.get(timeKey);
          const value = parseFloat(item.value);
          // Store the value for this sensor (may overwrite if multiple sensors update at same timestamp)
          point[sensor.name] = value;
          
          // Store data_status (live/offline) - prioritize 'offline' if any sensor is offline
          if (item.data_status) {
            // Always update if we have data_status from API
            if (point.liveStatus === null || point.liveStatus === 'live') {
              point.liveStatus = item.data_status;
            }
            // If point.liveStatus is already 'offline', keep it as 'offline'
          } else if (point.liveStatus === null) {
            // Default to 'live' if data_status not available (backwards compatibility)
            point.liveStatus = 'live';
          }
          
          // Debug: Log data_status for first few records
          if (itemIndex < 2 && item.data_status) {
            console.log(`📊 Record ${itemIndex} data_status for ${sensor.name}:`, item.data_status, 'at', item.timestamp);
          }
        });
      });
      
      console.log(`📊 Total unique timestamps: ${dataMap.size}`);

      // Convert map to array and sort by timestamp
      let timelineArray = Array.from(dataMap.values()).sort((a, b) => 
        a.timestamp - b.timestamp
      );

      // Apply shift filter if selected
      if (selectedShiftId !== 'all') {
        const selectedShift = shifts.find(s => s.id === parseInt(selectedShiftId));
        if (selectedShift) {
          timelineArray = filterDataByShift(timelineArray, selectedShift);
        }
      }

      setReportData(timelineArray);
      console.log(`📊 Report data loaded: ${timelineArray.length} records`);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    // CSV headers
    const headers = ['Serial Number', 'Date', 'Time', 'Live Status', ...sensors.map(s => s.name)];
    
    // CSV rows
    const rows = reportData.map((row, index) => {
      const status = row.liveStatus || 'live'; // Default to 'live' if not set
      const liveStatus = status === 'live' ? 'Live' : status === 'offline' ? 'Offline' : 'Unknown';
      const values = [
        index + 1, // Serial number
        row.date,
        row.time,
        liveStatus, // Live Status
        ...sensors.map(s => {
          const value = row[s.name];
          if (value === null || value === undefined) return '';
          return value === 1 ? 'On' : value === 0 ? 'Off' : '';
        })
      ];
      return values.join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sensor_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare worksheet data
    const headers = ['Serial Number', 'Date', 'Time', 'Live Status', ...sensors.map(s => s.name)];
    
    const rows = reportData.map((row, index) => {
      const status = row.liveStatus || 'live'; // Default to 'live' if not set
      const liveStatus = status === 'live' ? 'Live' : status === 'offline' ? 'Offline' : 'Unknown';
      return [
        index + 1, // Serial number
        row.date,
        row.time,
        liveStatus, // Live Status
        ...sensors.map(s => {
          const value = row[s.name];
          if (value === null || value === undefined) return '';
          return value === 1 ? 'On' : value === 0 ? 'Off' : '';
        })
      ];
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Serial Number
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 12 }, // Live Status
      ...sensors.map(() => ({ wch: 10 })) // Sensor columns
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sensor Status Report');

    // Generate Excel file and download
    const fileName = `sensor_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Historical data visualization and export</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (e.target.value !== 'custom') {
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="lastweek">Last Week</option>
              <option value="currentmonth">Current Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time (Optional)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time (Optional)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            />
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shift
            </label>
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            >
              <option value="all">All Shifts</option>
              {shifts.map(shift => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={loading || reportData.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Export to CSV
          </button>
          <button
            onClick={exportToExcel}
            disabled={loading || reportData.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Export to Excel
          </button>
          {reportData.length > 0 && (
            <span className="px-4 py-2 text-gray-600">
              {reportData.length} records found
            </span>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Sensor Status Report</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="text-lg">Loading report data...</div>
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No data available for the selected filters.</p>
            <p className="text-sm mt-2">Try adjusting your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-12 bg-gray-50 z-10">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-40 bg-gray-50 z-10">
                    Time
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Live Status
                  </th>
                  {sensors.map(sensor => (
                    <th key={sensor.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {sensor.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-12 bg-white z-10">
                      {row.date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-40 bg-white z-10">
                      {row.time}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {(() => {
                        const status = row.liveStatus || 'live'; // Default to 'live' if not set
                        if (status === 'live') {
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Live
                            </span>
                          );
                        } else if (status === 'offline') {
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Offline
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Unknown
                            </span>
                          );
                        }
                      })()}
                    </td>
                    {sensors.map(sensor => {
                      const value = row[sensor.name];
                      const status = value === 1 ? 'On' : value === 0 ? 'Off' : '';
                      const bgColor = value === 1 ? 'bg-green-100' : value === 0 ? 'bg-gray-100' : 'bg-white';
                      const textColor = value === 1 ? 'text-green-800' : value === 0 ? 'text-gray-800' : 'text-gray-400';
                      
                      return (
                        <td key={sensor.id} className={`px-4 py-3 whitespace-nowrap text-sm text-center ${bgColor} ${textColor} font-medium`}>
                          {status}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
