// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   experimental: {
//     turbo: true, // Turbopack 활성화
//   },
//   webpack(config, { dev }) {
//     if (dev) {
//       // 개발 모드에서 소스 맵 활성화
//       config.devtool = "source-map";
//     }

//     return config;
//   },
// };

/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    // SCSS 관련 설정 추가
    sassOptions: {
      logger: {
        warn: function(message) {
          // SCSS 경고 무시
        }
      }
    },
    // 클라이언트 사이드 전용 코드 처리를 위한 설정
    compiler: {
      styledComponents: true,
    },
    reactStrictMode: false,
    webpack: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
      return config;
    },
    // 정적 내보내기 설정 추가
    output: 'standalone',
};

export default nextConfig;