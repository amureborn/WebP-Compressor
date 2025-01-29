/*
(C) prepphint.com all right reserved.
*/
document.querySelector('.custom-browse-button').addEventListener('click', function() {
    document.getElementById('custom-webpInput').click();
});

document.getElementById('custom-webpInput').addEventListener('change', function(event) {
    const files = event.target.files;
    handleFiles(files);
    // Clear the input value to allow the same file to be uploaded again
    event.target.value = '';
});

const uploadArea = document.getElementById('custom-uploadfile');
uploadArea.addEventListener('dragover', function(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', function(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', function(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadArea.classList.remove('dragover');
    const files = event.dataTransfer.files;
    handleFiles(files);
});

document.getElementById('quality-checkbox').addEventListener('change', function(event) {
    if (event.target.checked) {
        document.getElementById('custom-qualityRange').disabled = false;
        document.getElementById('size-checkbox').checked = false;
        document.getElementById('custom-sizeRange').disabled = true;
    } else {
        document.getElementById('custom-qualityRange').disabled = true;
    }
    updateCompressButtonState();
    hideDownloadButton();
});

document.getElementById('size-checkbox').addEventListener('change', function(event) {
    if (event.target.checked) {
        document.getElementById('custom-sizeRange').disabled = false;
        document.getElementById('quality-checkbox').checked = false;
        document.getElementById('custom-qualityRange').disabled = true;
    } else {
        document.getElementById('custom-sizeRange').disabled = true;
    }
    updateCompressButtonState();
    hideDownloadButton();
});

document.getElementById('custom-sizeRange').addEventListener('input', function(event) {
    document.getElementById('custom-sizeValue').textContent = event.target.value;
    hideDownloadButton();
});

document.getElementById('custom-qualityRange').addEventListener('input', function(event) {
    document.getElementById('custom-qualityValue').textContent = event.target.value;
    updateQualityDescription(event.target.value);
    hideDownloadButton();
});

document.getElementById('custom-compressButton').addEventListener('click', function() {
    if (document.getElementById('size-checkbox').checked) {
        const maxSizeKB = document.getElementById('custom-sizeRange').value;
        for (const file of filesToCompress) {
            if (file.size / 1024 < maxSizeKB) {
                document.getElementById('size-error-message').style.display = 'block';
                return;
            } else {
                document.getElementById('size-error-message').style.display = 'none';
            }
        }
    }
    compressFiles();
});

let filesToCompress = [];

function handleFiles(files) {
    const previewContainer = document.getElementById('custom-previewContainer');
    previewContainer.style.display = 'flex';
    document.getElementById('custom-downloadButton').style.display = 'none'; // Hide download button when files are added

    for (const file of files) {
        if (file.type === 'image/webp') {
            filesToCompress.push(file);
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgWrapper = document.createElement('div');
                imgWrapper.style.position = 'relative';
                imgWrapper.classList.add('sortable-item');
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.classList.add('custom-preview-image');

                const removeButton = document.createElement('button');
                removeButton.classList.add('remove-button');
                removeButton.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.95 8.464a1 1 0 1 0-1.414-1.414L12 10.586 8.465 7.05A1 1 0 0 0 7.05 8.464L10.586 12 7.05 15.536a1 1 0 1 0 1.415 1.414L12 13.414l3.536 3.536a1 1 0 1 0 1.414-1.414L13.414 12z" fill="#000"/></svg>`;
                removeButton.addEventListener('click', function() {
                    const index = filesToCompress.indexOf(file);
                    if (index > -1) {
                        filesToCompress.splice(index, 1);
                    }
                    imgWrapper.remove();
                    if (filesToCompress.length === 0) {
                        document.getElementById('custom-compressButton').disabled = true;
                        hidePreviewContainer();
                        showUploadIcon();
                        resetSettings();
                    }
                    document.getElementById('custom-downloadButton').style.display = 'none'; // Hide download button when files are removed
                });

                imgWrapper.appendChild(img);
                imgWrapper.appendChild(removeButton);
                previewContainer.appendChild(imgWrapper);
            };
            reader.readAsDataURL(file);
        }
    }

    if (filesToCompress.length > 0) {
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('custom-compressButton').disabled = false;
        document.getElementById('quality-checkbox').disabled = false;
        document.getElementById('quality-checkbox').checked = true;
        document.getElementById('custom-qualityRange').disabled = false;
        document.getElementById('size-checkbox').disabled = false;
        hideUploadIcon();
    } else {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('custom-compressButton').disabled = true;
        document.getElementById('quality-checkbox').disabled = true;
        document.getElementById('size-checkbox').disabled = true;
    }

    // Initialize Sortable.js
    new Sortable(previewContainer, {
        animation: 150,
        onEnd: function (evt) {
            // Reorder filesToCompress array based on the new order
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;
            if (oldIndex !== newIndex) {
                const movedFile = filesToCompress.splice(oldIndex, 1)[0];
                filesToCompress.splice(newIndex, 0, movedFile);
            }
        }
    });
}

async function compressFiles() {
    if (filesToCompress.length === 0) return;

    const spinnerOverlay = document.getElementById('spinner-overlay');
    const downloadButton = document.getElementById('custom-downloadButton');

    downloadButton.style.display = 'none';
    spinnerOverlay.style.display = 'flex';

    const quality = document.getElementById('custom-qualityRange').value;
    const maxSizeKB = document.getElementById('custom-sizeRange').value;

    const options = {
        maxSizeMB: !document.getElementById('custom-sizeRange').disabled ? maxSizeKB / 1024 : undefined,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: !document.getElementById('custom-qualityRange').disabled ? quality / 100 : undefined
    };

    try {
        const compressedFiles = [];
        for (const file of filesToCompress) {
            let compressedFile = await imageCompression(file, options);
            if (document.getElementById('size-checkbox').checked) {
                while (compressedFile.size / 1024 > maxSizeKB && options.initialQuality > 0.05) {
                    options.initialQuality -= 0.05;
                    compressedFile = await imageCompression(file, options);
                }
                if (compressedFile.size / 1024 > maxSizeKB) {
                    compressedFile = await imageCompression(file, {
                        ...options,
                        maxSizeMB: maxSizeKB / 1024,
                        maxWidthOrHeight: 100 // Reduce resolution to meet the size
                    });
                }
            }
            compressedFiles.push(compressedFile);
        }
        if (compressedFiles.length === 1) {
            createSingleDownloadLink(compressedFiles[0]);
        } else {
            createDownloadLink(compressedFiles);
        }
    } catch (error) {
        document.getElementById('error-message').textContent = 'An error occurred during compression. Please try again.';
        document.getElementById('error-message').style.display = 'block';
    } finally {
        setTimeout(() => {
            spinnerOverlay.style.display = 'none';
            downloadButton.style.display = 'inline-block'; // Ensures the download button is shown after 1 second
        }, 1000); // Ensures the spinner is shown for at least 1 second
    }
}

function createSingleDownloadLink(compressedFile) {
    const downloadButton = document.getElementById('custom-downloadButton');
    const url = URL.createObjectURL(compressedFile);
    const originalFilename = filesToCompress[0].name.split('.').slice(0, -1).join('.');
    downloadButton.href = url;
    downloadButton.download = `${originalFilename}_prepphint.com.webp`;
}

function createDownloadLink(compressedFiles) {
    const downloadButton = document.getElementById('custom-downloadButton');
    const zip = new JSZip();
    compressedFiles.forEach((file, index) => {
        const originalFilename = filesToCompress[index].name.split('.').slice(0, -1).join('.');
        zip.file(`${originalFilename}_prepphint.com.webp`, file);
    });
    zip.generateAsync({ type: 'blob' }).then(function(content) {
        const url = URL.createObjectURL(content);
        downloadButton.href = url;
        downloadButton.download = 'compressed_prepphint.com.zip';
    });
}

function updateCompressButtonState() {
    const qualityCheckbox = document.getElementById('quality-checkbox');
    const sizeCheckbox = document.getElementById('size-checkbox');
    const compressButton = document.getElementById('custom-compressButton');
    compressButton.disabled = !qualityCheckbox.checked && !sizeCheckbox.checked;
}

function hideDownloadButton() {
    const downloadButton = document.getElementById('custom-downloadButton');
    downloadButton.style.display = 'none';
}

function hideUploadIcon() {
    const uploadIcon = document.getElementById('custom-uploadIcon');
    uploadIcon.style.display = 'none';
}

function showUploadIcon() {
    const uploadIcon = document.getElementById('custom-uploadIcon');
    uploadIcon.style.display = 'block';
}

function hidePreviewContainer() {
    const previewContainer = document.getElementById('custom-previewContainer');
    previewContainer.style.display = 'none';
}

function resetSettings() {
    document.getElementById('quality-checkbox').checked = false;
    document.getElementById('custom-qualityRange').disabled = true;
    document.getElementById('size-checkbox').checked = false;
    document.getElementById('custom-sizeRange').disabled = true;
    document.getElementById('quality-checkbox').disabled = true;
    document.getElementById('size-checkbox').disabled = true;
    updateCompressButtonState();
}

function updateQualityDescription(qualityValue) {
    const description = document.getElementById('custom-qualityDescription');
    if (qualityValue <= 30) {
        description.textContent = 'Significant reduction in file size, visible loss of quality.';
    } else if (qualityValue <= 60) {
        description.textContent = 'Moderate reduction in file size, moderate loss of quality.';
    } else if (qualityValue <= 90) {
        description.textContent = 'Small reduction in file size, minimal loss of quality.';
    } else {
        description.textContent = 'Very small reduction in file size, almost no loss of quality.';
    }
}