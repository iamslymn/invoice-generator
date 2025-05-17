document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const { jsPDF } = window.jspdf;
    let logoDataUrl = null;

    // Set current date as default for invoice date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

        // Leave invoice number empty    document.getElementById('invoiceNumber').value = '';

    // Logo Upload and Preview
    const logoInput = document.getElementById('companyLogo');
    const logoPreview = document.getElementById('logoPreview');

    logoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                logoDataUrl = e.target.result;
                logoPreview.innerHTML = `<img src="${logoDataUrl}" alt="Company Logo">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Add and remove service rows
    const servicesContainer = document.getElementById('servicesContainer');
    const addServiceBtn = document.getElementById('addService');

    addServiceBtn.addEventListener('click', function() {
        const serviceRow = document.createElement('div');
        serviceRow.className = 'service-row';
        serviceRow.innerHTML = `
            <input type="text" class="service-description" placeholder="Service Name" required>
            <textarea class="service-details" placeholder="Enter details (use new lines for multiple paragraphs)" rows="3"></textarea>
            <input type="number" class="service-price" placeholder="Price" step="0.01" min="0" required>
            <input type="text" class="service-notes" placeholder="Notes (e.g. materials & labor included)">
            <button type="button" class="remove-service">Remove</button>
        `;
        servicesContainer.appendChild(serviceRow);
        
        // Enable the remove button on the first row if more than one row exists
        if (servicesContainer.children.length > 1) {
            document.querySelector('.remove-service[disabled]')?.removeAttribute('disabled');
        }
        
        // Add event listener to the new remove button
        serviceRow.querySelector('.remove-service').addEventListener('click', function() {
            serviceRow.remove();
            
            // If only one row remains, disable its remove button
            if (servicesContainer.children.length === 1) {
                servicesContainer.querySelector('.remove-service').setAttribute('disabled', true);
            }
        });
    });

    // Form submission
    const invoiceForm = document.getElementById('invoiceForm');
    const invoicePreview = document.getElementById('invoicePreview');
    const previewContent = document.getElementById('previewContent');
    const downloadBtn = document.getElementById('downloadPdf');

    invoiceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Calculate totals
        let subtotal = 0;
        const services = [];
        
        document.querySelectorAll('.service-row').forEach(row => {
            const description = row.querySelector('.service-description').value;
            const details = row.querySelector('.service-details').value;
            const price = parseFloat(row.querySelector('.service-price').value);
            const notes = row.querySelector('.service-notes')?.value || '';
            
            services.push({ description, details, price, notes });
            subtotal += price;
        });
        
        const hstRate = parseFloat(document.getElementById('hstRate').value) / 100;
        const hstAmount = subtotal * hstRate;
        const total = subtotal + hstAmount;
        
        // Generate invoice HTML
        const invoiceHtml = generateInvoiceHtml(services, subtotal, hstRate, hstAmount, total);
        
        // Display the preview
        previewContent.innerHTML = invoiceHtml;
        invoicePreview.classList.remove('hidden');
        
        // Scroll to the preview
        invoicePreview.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Download PDF button
    downloadBtn.addEventListener('click', function() {
        generatePDF();
    });
    
    // Function to generate PDF - direct approach
    function generatePDF() {
        const { jsPDF } = window.jspdf;
        
        // Create PDF instance
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });
        
        // Get form values for direct creation
        const companyName = document.getElementById('companyName').value;
        const clientName = document.getElementById('clientName').value;
        const invoiceNumber = document.getElementById('invoiceNumber').value;
        const invoiceDate = new Date(document.getElementById('invoiceDate').value).toLocaleDateString();
        const paymentMethod = document.getElementById('paymentMethod').value;
        const etransferAccount = document.getElementById('etransferAccount').value;
        const termsConditions = document.getElementById('termsConditions').value;
        
        // Get content element
        const element = document.getElementById('previewContent');
        const mainContent = element.querySelector('.invoice-pdf');
        
        // Capture main content without payment section
        // Temporarily hide payment section
        const paymentSection = mainContent.querySelector('.invoice-payment');
        const termsSection = mainContent.querySelector('.invoice-terms');
        
        // Store original display styles
        const paymentDisplay = paymentSection.style.display;
        const termsDisplay = termsSection ? termsSection.style.display : 'block';
        
        // Hide payment and terms for first page
        paymentSection.style.display = 'none';
        if (termsSection) termsSection.style.display = 'none';
        
        // Render main content without payment info
        html2canvas(element, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            logging: false,
        }).then(canvas => {
            // First page content
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Add main content to first page
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            
            // Start a new page for payment info
            pdf.addPage();
            
            // Restore payment and terms display
            paymentSection.style.display = paymentDisplay;
            if (termsSection) termsSection.style.display = termsDisplay;
            
            // Hide everything except payment and terms for second page
            const elementsToHide = [
                mainContent.querySelector('.invoice-title'),
                mainContent.querySelector('.invoice-header'),
                mainContent.querySelector('.invoice-details'),
                mainContent.querySelector('.invoice-table'),
                mainContent.querySelector('.invoice-totals')
            ];
            
            // Store original display states
            const originalDisplays = elementsToHide.map(el => el.style.display);
            
            // Hide elements for payment page capture
            elementsToHide.forEach(el => {
                el.style.display = 'none';
            });
            
            // Capture only payment and terms sections
            html2canvas(element, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                logging: false,
            }).then(paymentCanvas => {
                // Add payment section to the second page
                const paymentImgData = paymentCanvas.toDataURL('image/jpeg', 1.0);
                const paymentImgWidth = pageWidth;
                const paymentImgHeight = (paymentCanvas.height * paymentImgWidth) / paymentCanvas.width;
                
                // Add to PDF second page - position at top
                pdf.addImage(paymentImgData, 'JPEG', 0, 0, paymentImgWidth, paymentImgHeight);
                
                // Restore original display states
                elementsToHide.forEach((el, index) => {
                    el.style.display = originalDisplays[index];
                });
                
                // Save the PDF
                pdf.save('invoice.pdf');
            });
        });
    }

    // Generate the invoice HTML
    function generateInvoiceHtml(services, subtotal, hstRate, hstAmount, total) {
        // Get form values
        const companyName = document.getElementById('companyName').value;
        const companyAddress = document.getElementById('companyAddress').value;
        const companyPhone = document.getElementById('companyPhone').value;
        const companyEmail = document.getElementById('companyEmail').value;
        const companyHST = document.getElementById('companyHST').value;
        
        const clientName = document.getElementById('clientName').value;
        const clientAddress = document.getElementById('clientAddress').value;
        const clientEmail = document.getElementById('clientEmail').value;
        const clientPhone = document.getElementById('clientPhone').value;
        
        const invoiceNumber = document.getElementById('invoiceNumber').value;
        const invoiceDate = new Date(document.getElementById('invoiceDate').value).toLocaleDateString();
        
        const paymentMethod = document.getElementById('paymentMethod').value;
        const etransferAccount = document.getElementById('etransferAccount').value;
        
        const currencySymbol = document.getElementById('currency').value;
        const termsConditions = document.getElementById('termsConditions').value;
        
        // Function to format service details with multiple paragraphs
        function formatServiceDetails(details) {
            if (!details) return '';
            
            // Split by newlines and format each line with the dash prefix
            const paragraphs = details.split('\n').filter(line => line.trim() !== '');
            
            if (paragraphs.length === 0) return '';
            
            return paragraphs.map(paragraph => 
                `<span class="service-description">— ${paragraph.trim()}</span>`
            ).join('');
        }
        
        // Build the HTML
        return `
            <div class="invoice-pdf">
                <div class="invoice-title">INVOICE</div>
                
                <div class="invoice-header">
                    <div>
                        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="${companyName}" class="invoice-logo">` : ''}
                    </div>
                    <div class="invoice-company">
                        <h2>${companyName}</h2>
                        <p>${companyAddress.replace(/\n/g, '<br>')}</p>
                        <p>Phone: ${companyPhone}</p>
                        <p>Email: ${companyEmail}</p>
                        ${companyHST ? `<p>HST#: ${companyHST}</p>` : ''}
                    </div>
                </div>
                
                <div class="invoice-details">
                    <div class="invoice-client">
                        <h3>Bill To:</h3>
                        <p><strong>${clientName}</strong></p>
                        <p>${clientAddress.replace(/\n/g, '<br>')}</p>
                        ${clientPhone ? `<p>Phone: ${clientPhone}</p>` : ''}
                        ${clientEmail ? `<p>Email: ${clientEmail}</p>` : ''}
                    </div>
                    
                    <div class="invoice-info">
                        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                        <p><strong>Date:</strong> ${invoiceDate}</p>
                    </div>
                </div>
                
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th width="70%">Description</th>
                            <th width="30%" class="price">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${services.map(service => `
                            <tr>
                                <td>
                                    <span class="service-name">${service.description}</span>
                                    ${formatServiceDetails(service.details)}
                                </td>
                                <td class="price">
                                    ${currencySymbol}${service.price.toFixed(2)}
                                    ${service.notes ? `<span class="service-note">${service.notes}</span>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="invoice-totals">
                    <table>
                        <tr>
                            <td class="total-label">Subtotal:</td>
                            <td class="total-value">${currencySymbol}${subtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td class="total-label">HST:</td>
                            <td class="total-value">${currencySymbol}${hstAmount.toFixed(2)}</td>
                        </tr>
                        <tr class="grand-total">
                            <td class="total-label">Total:</td>
                            <td class="total-value">${currencySymbol}${total.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="page-break-after: always;"></div>
                
                <div class="invoice-payment">
                    <h3>Payment Information</h3>
                    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                    ${paymentMethod === 'E-transfer' && etransferAccount ? 
                        `<p><strong>E-transfer Account:</strong> ${etransferAccount}</p>` : ''}
                </div>
                
                ${termsConditions ? `
                <div class="invoice-terms">
                    <h3>Terms and Conditions</h3>
                    <p>${termsConditions.replace(/\n/g, '<br>')}</p>
                </div>` : ''}
                
                <div class="invoice-footer">
                </div>
            </div>
        `;
    }
}); 