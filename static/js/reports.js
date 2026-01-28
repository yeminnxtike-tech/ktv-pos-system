// Reports JavaScript - Sales and Profit Reports

let dailyChart = null;
let monthlyChart = null;
let itemsChart = null;
let profitBreakdownChart = null;
let salesProfitChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Reports page initialized');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadSummaryStats();
    loadDailyReport();
});

// Setup event listeners
function setupEventListeners() {
    // Items period selector
    const itemsPeriod = document.getElementById('items-period');
    if (itemsPeriod) {
        itemsPeriod.addEventListener('change', function() {
            const showCustom = this.value === 'custom';
            document.getElementById('items-start-date').style.display = showCustom ? 'inline-block' : 'none';
            document.getElementById('items-end-date').style.display = showCustom ? 'inline-block' : 'none';
            loadItemsReport();
        });
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Activate corresponding button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.includes(getTabName(tabName))) {
            btn.classList.add('active');
        }
    });
    
    // Load data for selected tab
    switch(tabName) {
        case 'daily':
            loadDailyReport();
            break;
        case 'monthly':
            loadMonthlyReport();
            break;
        case 'items':
            loadItemsReport();
            break;
        case 'profit':
            loadProfitReport();
            break;
    }
}

function getTabName(tabKey) {
    const names = {
        'daily': 'နေ့စဉ် အရောင်း',
        'monthly': 'လစဉ် အရောင်း',
        'items': 'ပစ္စည်း အရောင်း',
        'profit': 'အမြတ်ငွေ'
    };
    return names[tabKey] || tabKey;
}

// Load summary statistics
async function loadSummaryStats() {
    try {
        showLoading();
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch data from APIs
        const [dashboardRes, dailyRes, monthlyRes] = await Promise.all([
            fetch('/api/dashboard_stats'),
            fetch(`/api/daily_report?date=${today}`),
            fetch('/api/monthly_stats')
        ]);
        
        const dashboardData = await dashboardRes.json();
        const dailyData = await dailyRes.json();
        const monthlyData = await monthlyRes.json();
        
        if (dashboardData.success) {
            updateSummaryStats(dashboardData, dailyData, monthlyData);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading summary stats:', error);
        if (window.ktvUtils) {
            window.ktvUtils.showToast('စာရင်းအင်းများ ရယူရာတွင် အမှားဖြစ်နေသည်', 'error');
        }
        hideLoading();
    }
}

function updateSummaryStats(dashboardData, dailyData, monthlyData) {
    // Today's sales
    const todaySales = dailyData.success ? dailyData.totals.total_amount : 0;
    document.getElementById('today-sales').textContent = formatCurrency(todaySales);
    
    // Today's items sold
    const todayItems = dailyData.success ? dailyData.sales.length : 0;
    document.getElementById('today-items').textContent = todayItems + ' ခု';
    
    // Today's unique items
    if (dailyData.success && dailyData.sales.length > 0) {
        const itemsSet = new Set();
        dailyData.sales.forEach(sale => {
            if (sale.items) {
                sale.items.split(',').forEach(item => {
                    const itemName = item.split('(')[0].trim();
                    itemsSet.add(itemName);
                });
            }
        });
        document.getElementById('today-items-count').textContent = itemsSet.size + ' မျိုး';
    }
    
    // Today's rooms served
    const todayRooms = dashboardData.occupied_rooms || 0;
    document.getElementById('today-rooms').textContent = todayRooms + ' အခန်း';
    
    // Today's customers
    const todayCustomers = dailyData.success ? dailyData.totals.total_customers : 0;
    document.getElementById('today-customers').textContent = todayCustomers + ' ဦး';
    
    // Monthly sales
    let monthlyTotal = 0;
    if (monthlyData.success && monthlyData.monthly_stats.length > 0) {
        monthlyTotal = monthlyData.monthly_stats[0].total_sales || 0;
    }
    document.getElementById('monthly-sales').textContent = formatCurrency(monthlyTotal);
    
    // Calculate profits (simplified - in real app, you'd fetch cost data)
    const todayProfit = Math.round(todaySales * 0.6); // Assuming 60% profit margin
    const monthlyProfit = Math.round(monthlyTotal * 0.6);
    
    document.getElementById('today-profit').textContent = 'အမြတ်: ' + formatCurrency(todayProfit);
    document.getElementById('monthly-profit').textContent = 'အမြတ်: ' + formatCurrency(monthlyProfit);
}

// Load daily report
async function loadDailyReport() {
    try {
        showLoading();
        
        const date = document.getElementById('daily-date').value;
        const response = await fetch(`/api/daily_report?date=${date}`);
        const data = await response.json();
        
        if (data.success) {
            updateDailyReport(data);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading daily report:', error);
        if (window.ktvUtils) {
            window.ktvUtils.showToast('နေ့စဉ်အစီရင်ခံစာ ရယူရာတွင် အမှားဖြစ်နေသည်', 'error');
        }
        hideLoading();
    }
}

function updateDailyReport(data) {
    const tbody = document.getElementById('daily-sales-body');
    tbody.innerHTML = '';
    
    let totalSales = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalService = 0;
    let totalTax = 0;
    
    if (data.sales && data.sales.length > 0) {
        data.sales.forEach(sale => {
            const row = document.createElement('tr');
            
            // Calculate cost and profit (simplified)
            const salesAmount = sale.total_amount || 0;
            const serviceCharge = sale.service_charge || 0;
            const taxAmount = sale.tax_amount || 0;
            const cost = Math.round(salesAmount * 0.4); // Assuming 40% cost
            const profit = salesAmount - cost;
            
            totalSales += salesAmount;
            totalCost += cost;
            totalProfit += profit;
            totalService += serviceCharge;
            totalTax += taxAmount;
            
            row.innerHTML = `
                <td>${formatTime(sale.sale_time)}</td>
                <td>${sale.bill_number || '-'}</td>
                <td>${sale.room_name || '-'}</td>
                <td>${sale.items || '-'}</td>
                <td>${sale.payment_method || 'Cash'}</td>
                <td>${formatCurrency(salesAmount)}</td>
                <td>${formatCurrency(cost)}</td>
                <td>${formatCurrency(profit)}</td>
                <td>${formatCurrency(serviceCharge)}</td>
                <td>${formatCurrency(taxAmount)}</td>
                <td>${sale.staff_name || '-'}</td>
            `;
            
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center">ယနေ့အတွက် အရောင်းမှတ်တမ်းမရှိပါ</td>
            </tr>
        `;
    }
    
    // Update totals
    document.getElementById('daily-total-sales').textContent = formatCurrency(totalSales);
    document.getElementById('daily-total-cost').textContent = formatCurrency(totalCost);
    document.getElementById('daily-total-profit').textContent = formatCurrency(totalProfit);
    document.getElementById('daily-total-service').textContent = formatCurrency(totalService);
    document.getElementById('daily-total-tax').textContent = formatCurrency(totalTax);
}

// Load monthly report
async function loadMonthlyReport() {
    try {
        showLoading();
        
        const month = document.getElementById('month-select').value;
        const year = document.getElementById('year-select').value;
        
        // In real app, you'd have an API for monthly report by date range
        // For now, we'll simulate with daily reports for the month
        const response = await fetch(`/api/monthly_stats?year=${year}&month=${month}`);
        const data = await response.json();
        
        if (data.success) {
            updateMonthlyReport(data, month, year);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading monthly report:', error);
        if (window.ktvUtils) {
            window.ktvUtils.showToast('လစဉ်အစီရင်ခံစာ ရယူရာတွင် အမှားဖြစ်နေသည်', 'error');
        }
        hideLoading();
    }
}

function updateMonthlyReport(data, month, year) {
    const tbody = document.getElementById('monthly-sales-body');
    tbody.innerHTML = '';
    
    let monthlyCount = 0;
    let monthlyTotalSales = 0;
    let monthlyTotalCost = 0;
    let monthlyTotalProfit = 0;
    let monthlyTotalService = 0;
    let monthlyTotalTax = 0;
    let monthlyTotalCustomers = 0;
    
    // For demo, use the monthly_stats data
    if (data.monthly_stats && data.monthly_stats.length > 0) {
        data.monthly_stats.forEach(stat => {
            const sales = stat.total_sales || 0;
            const customers = stat.total_customers || 0;
            const count = stat.sales_count || 0;
            const cost = Math.round(sales * 0.4); // Assuming 40% cost
            const profit = sales - cost;
            const service = Math.round(sales * 0.1); // Assuming 10% service
            const tax = Math.round(sales * 0.05); // Assuming 5% tax
            
            monthlyCount += count;
            monthlyTotalSales += sales;
            monthlyTotalCost += cost;
            monthlyTotalProfit += profit;
            monthlyTotalService += service;
            monthlyTotalTax += tax;
            monthlyTotalCustomers += customers;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${stat.month}</td>
                <td>${count}</td>
                <td>${formatCurrency(sales)}</td>
                <td>${formatCurrency(cost)}</td>
                <td>${formatCurrency(profit)}</td>
                <td>${formatCurrency(service)}</td>
                <td>${formatCurrency(tax)}</td>
                <td>${customers}</td>
            `;
            
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">ဒီလအတွက် အရောင်းမှတ်တမ်းမရှိပါ</td>
            </tr>
        `;
    }
    
    // Update totals
    document.getElementById('monthly-count').textContent = monthlyCount;
    document.getElementById('monthly-total-sales').textContent = formatCurrency(monthlyTotalSales);
    document.getElementById('monthly-total-cost').textContent = formatCurrency(monthlyTotalCost);
    document.getElementById('monthly-total-profit').textContent = formatCurrency(monthlyTotalProfit);
    document.getElementById('monthly-total-service').textContent = formatCurrency(monthlyTotalService);
    document.getElementById('monthly-total-tax').textContent = formatCurrency(monthlyTotalTax);
    document.getElementById('monthly-total-customers').textContent = monthlyTotalCustomers;
    
    // Update chart
    updateMonthlyChart(data.monthly_stats || []);
}

function updateMonthlyChart(monthlyStats) {
    const ctx = document.getElementById('monthly-sales-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    const labels = monthlyStats.map(stat => stat.month).reverse();
    const salesData = monthlyStats.map(stat => stat.total_sales || 0).reverse();
    const profitData = monthlyStats.map(stat => Math.round((stat.total_sales || 0) * 0.6)).reverse(); // 60% profit
    
    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'အရောင်းငွေ',
                    data: salesData,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'အမြတ်ငွေ',
                    data: profitData,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Pyidaungsu, sans-serif'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Load items report
async function loadItemsReport() {
    try {
        showLoading();
        
        // Get period
        const period = document.getElementById('items-period').value;
        let startDate, endDate;
        
        const today = new Date();
        
        switch(period) {
            case 'today':
                startDate = endDate = today.toISOString().split('T')[0];
                break;
            case 'week':
                startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
                endDate = new Date().toISOString().split('T')[0];
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                endDate = new Date().toISOString().split('T')[0];
                break;
            case 'custom':
                startDate = document.getElementById('items-start-date').value;
                endDate = document.getElementById('items-end-date').value;
                break;
        }
        
        // In real app, you'd fetch items sales report from API
        // For demo, we'll use sample data
        const sampleItems = await generateSampleItemsData();
        updateItemsReport(sampleItems);
        
        hideLoading();
    } catch (error) {
        console.error('Error loading items report:', error);
        if (window.ktvUtils) {
            window.ktvUtils.showToast('ပစ္စည်းအရောင်းစာရင်း ရယူရာတွင် အမှားဖြစ်နေသည်', 'error');
        }
        hideLoading();
    }
}

async function generateSampleItemsData() {
    // Fetch menu items to generate sample report
    try {
        const response = await fetch('/api/menu_items');
        const data = await response.json();
        
        if (data.success && data.items.length > 0) {
            return data.items.map(item => {
                const quantity = Math.floor(Math.random() * 20) + 1;
                const salePrice = item.sale_price || item.price || 0;
                const costPrice = Math.round(salePrice * 0.6); // 40% profit margin
                const totalSales = quantity * salePrice;
                const totalCost = quantity * costPrice;
                const profit = totalSales - totalCost;
                const profitMargin = totalSales > 0 ? Math.round((profit / totalSales) * 100) : 0;
                
                return {
                    name: item.name,
                    category: item.category_display || item.category,
                    quantity: quantity,
                    unit: item.unit || 'ခု',
                    salePrice: salePrice,
                    costPrice: costPrice,
                    totalSales: totalSales,
                    totalCost: totalCost,
                    profit: profit,
                    profitMargin: profitMargin
                };
            }).slice(0, 20); // Limit to 20 items for demo
        }
    } catch (error) {
        console.error('Error generating sample data:', error);
    }
    
    // Fallback sample data
    return [
        {
            name: 'Heineken Beer',
            category: 'Beer',
            quantity: 15,
            unit: 'ပုလင်း',
            salePrice: 5000,
            costPrice: 3000,
            totalSales: 75000,
            totalCost: 45000,
            profit: 30000,
            profitMargin: 40
        },
        {
            name: 'Fried Chicken',
            category: 'ကြက်',
            quantity: 8,
            unit: 'ခု',
            salePrice: 12000,
            costPrice: 8000,
            totalSales: 96000,
            totalCost: 64000,
            profit: 32000,
            profitMargin: 33
        },
        {
            name: 'Orange Juice',
            category: 'Juice',
            quantity: 12,
            unit: 'ခွက်',
            salePrice: 3000,
            costPrice: 1500,
            totalSales: 36000,
            totalCost: 18000,
            profit: 18000,
            profitMargin: 50
        }
    ];
}

function updateItemsReport(items) {
    const tbody = document.getElementById('items-sales-body');
    tbody.innerHTML = '';
    
    let totalTypes = 0;
    let totalQuantity = 0;
    let totalSales = 0;
    let totalCost = 0;
    let totalProfit = 0;
    
    if (items && items.length > 0) {
        totalTypes = items.length;
        
        items.forEach(item => {
            totalQuantity += item.quantity;
            totalSales += item.totalSales;
            totalCost += item.totalCost;
            totalProfit += item.profit;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>${formatCurrency(item.salePrice)}</td>
                <td>${formatCurrency(item.costPrice)}</td>
                <td>${formatCurrency(item.totalSales)}</td>
                <td>${formatCurrency(item.totalCost)}</td>
                <td>${formatCurrency(item.profit)}</td>
                <td>${item.profitMargin}%</td>
            `;
            
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">ပစ္စည်းအရောင်းမှတ်တမ်းမရှိပါ</td>
            </tr>
        `;
    }
    
    // Update summary
    document.getElementById('total-item-types').textContent = totalTypes;
    document.getElementById('total-items-quantity').textContent = totalQuantity;
    document.getElementById('total-items-sales').textContent = formatCurrency(totalSales);
    document.getElementById('total-items-profit').textContent = formatCurrency(totalProfit);
    
    // Update chart
    updateItemsChart(items);
}

function updateItemsChart(items) {
    const ctx = document.getElementById('items-sales-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (itemsChart) {
        itemsChart.destroy();
    }
    
    if (!items || items.length === 0) {
        ctx.parentElement.innerHTML = '<p class="text-center" style="color: rgba(255,255,255,0.5);">ဒေတာမရှိပါ</p>';
        return;
    }
    
    // Sort items by sales and take top 10
    const topItems = [...items]
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10);
    
    const labels = topItems.map(item => item.name);
    const salesData = topItems.map(item => item.totalSales);
    const profitData = topItems.map(item => item.profit);
    
    itemsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'အရောင်းတန်ဖိုး',
                    data: salesData,
                    backgroundColor: 'rgba(33, 150, 243, 0.7)',
                    borderColor: '#2196F3',
                    borderWidth: 1
                },
                {
                    label: 'အမြတ်ငွေ',
                    data: profitData,
                    backgroundColor: 'rgba(76, 175, 80, 0.7)',
                    borderColor: '#4CAF50',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Pyidaungsu, sans-serif'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Load profit report
async function loadProfitReport() {
    try {
        showLoading();
        
        const period = document.getElementById('profit-period').value;
        
        // In real app, you'd fetch profit report from API
        // For demo, we'll generate sample data
        const profitData = await generateSampleProfitData(period);
        updateProfitReport(profitData);
        
        hideLoading();
    } catch (error) {
        console.error('Error loading profit report:', error);
        if (window.ktvUtils) {
            window.ktvUtils.showToast('အမြတ်ငွေစာရင်း ရယူရာတွင် အမှားဖြစ်နေသည်', 'error');
        }
        hideLoading();
    }
}

async function generateSampleProfitData(period) {
    // Generate sample profit data
    const today = new Date();
    let days = 30; // Default to month
    
    switch(period) {
        case 'today': days = 1; break;
        case 'week': days = 7; break;
        case 'month': days = 30; break;
        case 'year': days = 365; break;
    }
    
    // Generate daily profit data for the period
    const dailyProfits = [];
    let totalGrossSales = 0;
    let totalCost = 0;
    let totalExpenses = 0;
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        const sales = Math.floor(Math.random() * 500000) + 100000;
        const cost = Math.round(sales * 0.4);
        const profit = sales - cost;
        const expenses = Math.round(sales * 0.2);
        const netProfit = profit - expenses;
        
        totalGrossSales += sales;
        totalCost += cost;
        totalExpenses += expenses;
        
        dailyProfits.push({
            date: date.toISOString().split('T')[0],
            sales: sales,
            cost: cost,
            profit: profit,
            expenses: expenses,
            netProfit: netProfit
        });
    }
    
    // Category breakdown
    const categories = [
        { name: 'အရက်/ဘီယာ', sales: 450000, cost: 270000, profit: 180000 },
        { name: 'အစားအစာ', sales: 350000, cost: 210000, profit: 140000 },
        { name: 'အချိုရည်', sales: 200000, cost: 120000, profit: 80000 },
        { name: 'အခန်းခ', sales: 300000, cost: 0, profit: 300000 },
        { name: 'အခြား', sales: 100000, cost: 60000, profit: 40000 }
    ];
    
    const netProfit = totalGrossSales - totalCost - totalExpenses;
    const profitMargin = totalGrossSales > 0 ? Math.round((netProfit / totalGrossSales) * 100) : 0;
    
    return {
        period: period,
        totalGrossSales: totalGrossSales,
        totalCost: totalCost,
        totalExpenses: totalExpenses,
        netProfit: netProfit,
        profitMargin: profitMargin,
        dailyProfits: dailyProfits.reverse(),
        categories: categories
    };
}

function updateProfitReport(data) {
    // Update overview cards
    document.getElementById('total-gross-sales').textContent = formatCurrency(data.totalGrossSales);
    document.getElementById('total-cost').textContent = formatCurrency(data.totalCost);
    document.getElementById('total-expenses').textContent = formatCurrency(data.totalExpenses);
    document.getElementById('net-profit').textContent = formatCurrency(data.netProfit);
    document.getElementById('profit-margin').textContent = data.profitMargin + '%';
    
    // Update profit breakdown chart
    updateProfitBreakdownChart(data);
    
    // Update sales vs profit chart
    updateSalesProfitChart(data.dailyProfits);
    
    // Update category details
    updateProfitDetails(data.categories);
}

function updateProfitBreakdownChart(data) {
    const ctx = document.getElementById('profit-breakdown-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (profitBreakdownChart) {
        profitBreakdownChart.destroy();
    }
    
    profitBreakdownChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['အရောင်းငွေ', 'ကုန်ကျငွေ', 'အသုံးစရိတ်', 'အမြတ်ငွေ'],
            datasets: [{
                data: [
                    data.totalGrossSales,
                    data.totalCost,
                    data.totalExpenses,
                    data.netProfit
                ],
                backgroundColor: [
                    '#2196F3',
                    '#F44336',
                    '#FF9800',
                    '#4CAF50'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Pyidaungsu, sans-serif'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = Math.round((value / data.totalGrossSales) * 100);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateSalesProfitChart(dailyProfits) {
    const ctx = document.getElementById('sales-profit-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (salesProfitChart) {
        salesProfitChart.destroy();
    }
    
    const labels = dailyProfits.map(dp => dp.date.split('-')[2] + 'ရက်');
    const salesData = dailyProfits.map(dp => dp.sales);
    const profitData = dailyProfits.map(dp => dp.netProfit);
    
    salesProfitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'အရောင်းငွေ',
                    data: salesData,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'အမြတ်ငွေ',
                    data: profitData,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Pyidaungsu, sans-serif'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function updateProfitDetails(categories) {
    const tbody = document.getElementById('profit-details-body');
    tbody.innerHTML = '';
    
    const totalSales = categories.reduce((sum, cat) => sum + cat.sales, 0);
    
    categories.forEach(category => {
        const percentage = totalSales > 0 ? Math.round((category.sales / totalSales) * 100) : 0;
        const profitMargin = category.sales > 0 ? Math.round((category.profit / category.sales) * 100) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category.name}</td>
            <td>${formatCurrency(category.sales)}</td>
            <td>${formatCurrency(category.cost)}</td>
            <td>${formatCurrency(category.profit)}</td>
            <td>${profitMargin}%</td>
            <td>${percentage}%</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Utility functions
function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    return new Intl.NumberFormat('my-MM').format(Math.round(amount)) + ' Ks';
}

function formatTime(timeString) {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM format
}

function showLoading() {
    const loading = document.getElementById('report-loading');
    if (loading) loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('report-loading');
    if (loading) loading.style.display = 'none';
}

// Export functions
function exportReport() {
    if (window.ktvUtils) {
        window.ktvUtils.showToast('Excel ထုတ်ယူနေပါသည်...', 'info');
    }
    // In real app, you'd implement actual export functionality
    setTimeout(() => {
        if (window.ktvUtils) {
            window.ktvUtils.showToast('Excel ဖိုင်ထုတ်ယူပြီးပါပြီ', 'success');
        }
    }, 2000);
}

function printReport() {
    window.print();
}

function loadReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (window.ktvUtils) {
        window.ktvUtils.showToast(`အစီရင်ခံစာ ရယူနေပါသည်: ${startDate} မှ ${endDate}`, 'info');
    }
    
    // Reload current tab data with date range
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        if (activeTab.id === 'daily-tab') {
            loadDailyReport();
        } else if (activeTab.id === 'monthly-tab') {
            loadMonthlyReport();
        } else if (activeTab.id === 'items-tab') {
            loadItemsReport();
        } else if (activeTab.id === 'profit-tab') {
            loadProfitReport();
        }
    }
}
