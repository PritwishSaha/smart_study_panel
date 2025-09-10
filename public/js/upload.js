document.addEventListener('DOMContentLoaded', function() {
    const uploadContainer = document.getElementById('uploadContainer');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const fileList = document.getElementById('fileList');
    const successToast = document.getElementById('successToast');
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    const materialId = document.body.dataset.materialId; // Get material ID from data attribute
    
    // Get auth token from cookies
    function getAuthToken() {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; token=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorToast.classList.remove('hidden');
        setTimeout(() => {
            errorToast.classList.add('hidden');
        }, 5000);
    }

    // Show success message
    function showSuccess(message) {
        const successMessage = successToast.querySelector('span');
        if (successMessage) successMessage.textContent = message;
        successToast.classList.remove('hidden');
        setTimeout(() => {
            successToast.classList.add('hidden');
        }, 3000);
    }

    // Handle file upload
    async function uploadFile(file) {
        if (!materialId) {
            showError('Material ID is missing');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`/api/v1/materials/${materialId}/file`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: formData,
                // Handle progress if needed
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            showSuccess('File uploaded successfully!');
            addFileToList(file, data.data.filePath);
            return data;
        } catch (error) {
            console.error('Upload error:', error);
            showError(error.message || 'Error uploading file. Please try again.');
            throw error;
        } finally {
            // Reset progress
            setTimeout(() => {
                uploadProgress.classList.add('hidden');
                progressBar.style.width = '0%';
                progressPercent.textContent = '0%';
            }, 1000);
        }
    }

    // Add file to the list
    function addFileToList(file, fileUrl) {
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        const fileType = getFileType(file.type);
        const fileIcon = getFileIcon(file.type);
        
        const fileElement = document.createElement('div');
        fileElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        fileElement.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="p-2 ${fileType.bgColor} rounded-lg">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${file.name}</p>
                    <p class="text-xs text-gray-500">${fileSize} MB • ${fileType.name}</p>
                </div>
            </div>
            <div class="flex space-x-2">
                <a href="${fileUrl}" target="_blank" class="text-indigo-600 hover:text-indigo-800">
                    <i class="fas fa-eye"></i>
                </a>
                <button class="text-red-600 hover:text-red-800" onclick="this.closest('div').remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        if (fileList.firstChild && fileList.firstChild.textContent.includes('No files')) {
            fileList.innerHTML = '';
        }
        
        fileList.prepend(fileElement);
    }

    // Get file type information
    function getFileType(mimeType) {
        const types = {
            'application/pdf': { name: 'PDF', bgColor: 'bg-red-100' },
            'application/msword': { name: 'DOC', bgColor: 'bg-blue-100' },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { name: 'DOCX', bgColor: 'bg-blue-100' },
            'application/vnd.ms-powerpoint': { name: 'PPT', bgColor: 'bg-orange-100' },
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': { name: 'PPTX', bgColor: 'bg-orange-100' },
            'image/jpeg': { name: 'JPEG', bgColor: 'bg-green-100' },
            'image/png': { name: 'PNG', bgColor: 'bg-green-100' }
        };
        return types[mimeType] || { name: 'File', bgColor: 'bg-gray-100' };
    }

    // Get file icon based on MIME type
    function getFileIcon(mimeType) {
        const icons = {
            'application/pdf': 'fas fa-file-pdf text-red-500',
            'application/msword': 'fas fa-file-word text-blue-500',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fas fa-file-word text-blue-500',
            'application/vnd.ms-powerpoint': 'fas fa-file-powerpoint text-orange-500',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fas fa-file-powerpoint text-orange-500',
            'image/jpeg': 'fas fa-file-image text-green-500',
            'image/png': 'fas fa-file-image text-green-500'
        };
        return icons[mimeType] || 'fas fa-file text-gray-500';
    }

    // Handle file selection
    async function handleFiles(e) {
        const files = e.target.files || (e.dataTransfer && e.dataTransfer.files);
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file type
        const validTypes = [
            'application/pdf', 
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg', 
            'image/png'
        ];
        
        if (!validTypes.includes(file.type)) {
            showError('Invalid file type. Please upload a PDF, DOCX, PPTX, JPG, or PNG file.');
            return;
        }
        
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            showError('File is too large. Maximum size is 10MB.');
            return;
        }
        
        // Show upload progress
        uploadProgress.classList.remove('hidden');
        
        // Update progress bar
        const updateProgress = (loaded, total) => {
            const percent = Math.round((loaded / total) * 100);
            progressBar.style.width = `${percent}%`;
            progressPercent.textContent = `${percent}%`;
        };

        // Upload the file
        try {
            await uploadFile(file);
        } catch (error) {
            console.error('Upload failed:', error);
        }
    }

    // Event Listeners
    if (uploadContainer) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, preventDefaults, false);
            if (eventName !== 'drop') {
                document.body.addEventListener(eventName, preventDefaults, false);
            }
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, unhighlight, false);
        });

        // Handle dropped files
        uploadContainer.addEventListener('drop', handleFiles, false);

        // Handle click to select files
        uploadContainer.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFiles);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        uploadContainer.classList.add('border-indigo-500', 'bg-indigo-50');
    }

    function unhighlight() {
        uploadContainer.classList.remove('border-indigo-500', 'bg-indigo-50');
    }
});
