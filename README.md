# AD Data Visualizer

AD Data Visualizer is an interactive web application built with React, TypeScript, and Three.js that enables researchers and medical professionals to explore and analyze Alzheimer's Disease (AD) MRI datasets in an immersive 3D environment. The application visualizes thousands of brain MRI slices arranged in a spherical 3D space, allowing users to filter images by anatomical plane (axial, coronal, sagittal), image version (original or enhanced), clinical classification (CN for cognitively normal or AD for Alzheimer's disease), and dataset split (training, validation, or test). Leveraging AWS CloudFront CDN for fast global image delivery and implementing performance optimizations such as Level of Detail (LOD) rendering with a maximum of 500 concurrent images, progressive batch loading, and service worker caching, the viewer provides smooth navigation and real-time image comparison capabilities. The application supports both cloud-hosted images via S3/CloudFront and local development workflows, making it suitable for both production deployments and offline research environments.

## 🖼️ 3D Data Viewer

The `data-viewer` directory contains a React application built with Vite and Three.js for visualizing the processed MRI data in a 3D space.

### Key Features

-   **Interactive 3D Visualization**: Explore thousands of MRI slices in a spherical arrangement.
-   **Dynamic Filtering**: Filter images by plane, class, version, and dataset split.
-   **Performance Optimized**:
    -   **CloudFront CDN**: For fast global image delivery.
    -   **Level of Detail (LOD)**: Renders a maximum of 500 images at once.
    -   **Progressive Loading**: Shows placeholders and thumbnails for a smooth user experience.
-   **Image Comparison**: View original and enhanced images side-by-side.

### Getting Started

1.  **Navigate to the data viewer directory:**
    ```bash
    cd data-viewer
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```

## ☁️ Cloud Infrastructure

The data viewer is configured to leverage AWS S3 and CloudFront for efficient and scalable image hosting. You will need to set up your own bucket and distribution.

-   **S3 Bucket**: Set this up to host your image data.
-   **CloudFront Domain**: Connect this to your S3 bucket for CDN delivery.

Scripts to help you manage the cloud infrastructure are available in the `data-viewer/scripts` directory. You will need to update the placeholder values in these scripts with your own resource names.

## 🤝 Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request.

## 📧 Contact

For any questions or issues, please contact Izzat Zaky at [izzat.zaky@gmail.com](mailto:izzat.zaky@gmail.com).
