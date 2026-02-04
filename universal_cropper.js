class UniversalCropper {
    constructor(modalId, imageId, options = {}) {
        this.modalId = modalId;
        this.imageId = imageId;
        this.modal = document.getElementById(modalId);
        this.image = document.getElementById(imageId);
        this.cropper = null;
        this.resolvePromise = null;
        this.rejectPromise = null;

        // Bind UI buttons if they exist
        this.bindUi();
    }

    bindUi() {
        // We look for buttons with specific data-attributes or IDs within the modal or global scope
        // For compatibility with existing admin.html, we might need to expose methods globally
        // or attach listeners to specific existing buttons.

        // However, to make it universal, we can also look for buttons inside the modal
        if (this.modal) {
            const saveBtn = this.modal.querySelector('.btn-primary'); // "Crop & Use"
            const cancelBtn = this.modal.querySelector('.btn-secondary[onclick*="cancel"]'); // "Cancel"
            // Note: admin.html has inline onclicks. We'll override or rely on them calling global methods.
        }
    }

    start(file, aspectRatio = NaN) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject("No file provided");
                return;
            }

            this.resolvePromise = resolve;
            this.rejectPromise = reject;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.image.src = e.target.result;
                this.modal.style.display = 'flex';

                if (this.cropper) this.cropper.destroy();
                this.cropper = new Cropper(this.image, {
                    aspectRatio: aspectRatio,
                    viewMode: 1,
                    autoCropArea: 1,
                });
            };
            reader.onerror = () => {
                reject("Failed to read file");
            };
            reader.readAsDataURL(file);
        });
    }

    setAspectRatio(ratio) {
        if (this.cropper) {
            this.cropper.setAspectRatio(ratio);
        }
    }

    finish(options = { maxWidth: 1000, maxHeight: 1000, quality: 0.9 }) {
        if (!this.cropper) return;

        this.cropper.getCroppedCanvas({
            maxWidth: options.maxWidth || 1000,
            maxHeight: options.maxHeight || 1000
        }).toBlob((blob) => {
            this.modal.style.display = 'none';
            if (this.resolvePromise) {
                this.resolvePromise(blob);
            }
            this.cleanup();
        }, 'image/jpeg', options.quality || 0.9);
    }

    cancel() {
        this.modal.style.display = 'none';
        if (this.rejectPromise) {
            this.rejectPromise('Cancelled');
        }
        this.cleanup();
    }

    cleanup() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        this.image.src = '';
        this.resolvePromise = null;
        this.rejectPromise = null;
    }
}

// Create a global instance for ease of use
window.universalCropper = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only init if the modal elements exist
    if (document.getElementById('cropperModal')) {
        window.universalCropper = new UniversalCropper('cropperModal', 'cropperImage');
    }
});
