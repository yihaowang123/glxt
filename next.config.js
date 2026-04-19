/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'www.yihaowang.top',
      },
      {
        protocol: 'http',
        hostname: 'www.yihaowanf.top',
      },
    ],
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
    outputFileTracingExcludes: [
      '**/cache/**',
      '**/.cache/**',
      '**/node_modules/.cache/**',
    ],
  },

  webpack: (config, { isServer }) => {
    config.cache = false;

    if (!isServer) {
      if (!config.optimization) {
        config.optimization = {};
      }
      if (!config.optimization.splitChunks) {
        config.optimization.splitChunks = {};
      }

      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.maxInitialRequests = 25;
      config.optimization.splitChunks.minSize = 10000;
      config.optimization.splitChunks.maxSize = 2400000;
      config.optimization.splitChunks.cacheGroups = {
        default: false,
        vendors: false,
        commons: {
          name: 'commons',
          chunks: 'all',
          minChunks: 2,
          priority: -20,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'vendor-react',
          chunks: 'all',
          priority: 40,
        },
        supabase: {
          test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
          name: 'vendor-supabase',
          chunks: 'all',
          priority: 35,
        },
        exceljs: {
          test: /[\\/]node_modules[\\/](exceljs)[\\/]/,
          name: 'vendor-exceljs',
          chunks: 'all',
          priority: 30,
        },
        radix: {
          test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
          name: 'vendor-radix',
          chunks: 'all',
          priority: 25,
        },
        datefns: {
          test: /[\\/]node_modules[\\/](date-fns)[\\/]/,
          name: 'vendor-datefns',
          chunks: 'all',
          priority: 25,
        },
        other: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor-other',
          chunks: 'all',
          priority: 10,
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;