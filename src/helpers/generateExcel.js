
//Excel JS
import ExcelJS from 'exceljs';

// Helper function to generate Excel workbook and worksheet
const generateExcel = (ordersByBranch, totalWeightInTons) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders by Branch');

    worksheet.columns = [
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Subcategory', key: 'subcategory', width: 20 },
        { header: 'Total Weight (Tons)', key: 'weight', width: 20 }
    ];

    Object.entries(ordersByBranch).forEach(([branchName, branchData]) => {
        Object.entries(branchData.subcategories).forEach(([subcategoryName, subcategoryData]) => {
            worksheet.addRow({ branch: branchName, subcategory: subcategoryName, weight: subcategoryData.subcategoryWeightInTons });
        });
    });

    worksheet.addRow({ branch: 'Total Weight', subcategory: '', weight: totalWeightInTons });

    return workbook;
};

// Helper function to generate Excel workbook and worksheet for total weight by branch from a time range
const generateExcelForTotalWeightByBranchFromTimeRange = (ordersByBranch, totalWeightInTons) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Total Weight by Branch');

    worksheet.columns = [
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Total Weight (Tons)', key: 'weight', width: 20 }
    ];

    Object.entries(ordersByBranch).forEach(([branchName, branchData]) => {
        worksheet.addRow({ branch: branchName, weight: branchData.totalWeightBranch });
    });

    worksheet.addRow({ branch: 'Total Weight', weight: totalWeightInTons });

    return workbook;
};

const generateExcelForTotalWeightFromAllBranchesFromTimeRange = (ordersByBranch, totalWeightInTons) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Total Weight by Branch');

    worksheet.columns = [
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Total Weight (Tons)', key: 'weight', width: 20 }
    ];

    Object.entries(ordersByBranch).forEach(([branchName, branchData]) => {
        worksheet.addRow({ branch: branchName, weight: branchData.totalWeight });
    });

    worksheet.addRow({ branch: 'Total Weight', weight: totalWeightInTons });

    return workbook;
};

const generateExcelForTotalRevenueFromAllBranchesFromTimeRange = (ordersByDay) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Total Revenue by Day');

    worksheet.columns = [
        { header: 'Date', key: 'day', width: 10 },
        { header: 'Total Revenue', key: 'revenue', width: 20, numFmt: '$#,##0.00' }
    ];

    Object.entries(ordersByDay).forEach(([day, revenue]) => {
        worksheet.addRow({ day, revenue });
    });

    return workbook;
};

const generateExcelForTotalOrdersByBranchFromTimeRange = (ordersByBranch) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Total Orders by Branch');

    worksheet.columns = [
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Total Orders', key: 'totalOrders', width: 20 }
    ];

    Object.entries(ordersByBranch).forEach(([branchName, totalOrders]) => {
        worksheet.addRow({ branch: branchName, totalOrders });
    });

    return workbook;
};

const generateExcelForTotalOrdersFromAllBranchesFromTimeRange = (ordersByWeek) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Total Orders by Week');

    worksheet.columns = [
        { header: 'Week', key: 'week', width: 10 },
        { header: 'Total Orders', key: 'totalOrders', width: 20 }
    ];

    Object.entries(ordersByWeek).forEach(([week, totalOrders]) => {
        worksheet.addRow({ week, totalOrders });
    });

    return workbook;
};

const generateExcelForTotalRevenueByBranchFromTimeRange = (revenueByBranchByDate) => {
    const workbook = new ExcelJS.Workbook();

    // Loop through each date and create a new worksheet for it
    Object.entries(revenueByBranchByDate).forEach(([date, revenueByBranch]) => {
        // Format the date in a way that can be used as a worksheet name
        const formattedDate = date.split('/').join('-'); // Replace slashes with dashes or use any other suitable formatting

        const worksheet = workbook.addWorksheet(`Revenue ${formattedDate}`);

        worksheet.columns = [
            { header: 'Branch ID', key: 'branchID', width: 15 },
            { header: 'Total Revenue', key: 'revenue', width: 20, numFmt: '$#,##0.00' },
        ];

        // Loop through each branch and add its data to the worksheet
        Object.entries(revenueByBranch).forEach(([branchID, revenue]) => {
            worksheet.addRow({ branchID, revenue });
        });
    });

    return workbook;
};

const generateExcelForTotalRevenueByBranchNameFromTimeRange = (revenueByBranchNameByDate) => {
    const workbook = new ExcelJS.Workbook();

    // Loop through each branch name and create a new worksheet for it
    for (const branchName in revenueByBranchNameByDate) {
        const worksheet = workbook.addWorksheet(`Revenue ${branchName}`);

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total Revenue', key: 'revenue', width: 20, numFmt: '$#,##0.00' },
        ];

        // Loop through revenue data for each date for the current branch name
        for (const date in revenueByBranchNameByDate[branchName]) {
            const revenue = revenueByBranchNameByDate[branchName][date];
            worksheet.addRow({ date, revenue });
        }
    }

    return workbook;
};

const generateExcelWithSubcategoryWeight = (subcategoriesTotalWeight) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subcategory Weight');

    worksheet.columns = [
        { header: 'Subcategory', key: 'subcategory', width: 20 },
        { header: 'Total Weight (Tons)', key: 'weight', width: 20 }
    ];

    Object.entries(subcategoriesTotalWeight).forEach(([subcategoryName, totalWeightInTons]) => {
        worksheet.addRow({ subcategory: subcategoryName, weight: totalWeightInTons });
    });

    return workbook;
};

const generateExcelForOrdersWithAllDetails = (latestOrders) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders With Details');

    // Define the columns for the Excel sheet
    worksheet.columns = [
        { header: 'N. Orden', key: 'orderNumber', width: 15 },
        { header: 'Fecha de Creacion', key: 'createdAt', width: 20 },
        { header: 'Nombre Sucursal', key: 'branchName', width: 20 },
        { header: 'Estado', key: 'status', width: 15 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Total Empresa', key: 'totalEnterprice', width: 15 },
        { header: 'Comision', key: 'comision', width: 15 },
        { header: 'Recolector', key: 'gatherer', width: 25 },
        { header: 'Residuo', key: 'SubCategoryName', width: 20 },
        { header: 'Peso Inicial', key: 'startingWeight', width: 15 },
        { header: 'Peso', key: 'weight', width: 15 },
        { header: 'ID Sucursal', key: 'branchID', width: 20 },
        { header: 'Subcategory ID', key: 'SubCategoryID', width: 20 },
    ];

    latestOrders.forEach((result) => {
        if (result.status === 'fulfilled') {
            const order = result.value;
            order.subcategories.forEach((subcategory) => {
                worksheet.addRow({
                    orderNumber: order.orderNumber,
                    createdAt: order.createdAt,
                    branchID: order.branchID,
                    status: order.status,
                    total: order.total,
                    totalEnterprice: order.totalEnterprice,
                    comision: order.comision,
                    gatherer: subcategory.gatherer,
                    SubCategoryID: subcategory.SubCategoryID,
                    SubCategoryName: subcategory.SubCategoryName,
                    startingWeight: subcategory.startingWeight,
                    weight: subcategory.weight,
                    branchName: order.branchName,
                });
            });
        }
    });

    return workbook;
};

module.exports = {
    generateExcel,
    generateExcelForTotalWeightByBranchFromTimeRange,
    generateExcelForTotalWeightFromAllBranchesFromTimeRange,
    generateExcelForTotalRevenueFromAllBranchesFromTimeRange,
    generateExcelForTotalOrdersByBranchFromTimeRange,
    generateExcelForTotalOrdersFromAllBranchesFromTimeRange,
    generateExcelForTotalRevenueByBranchFromTimeRange,
    generateExcelForTotalRevenueByBranchNameFromTimeRange,
    generateExcelWithSubcategoryWeight,
    generateExcelForOrdersWithAllDetails
};