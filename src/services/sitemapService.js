const { Tour } = require("../models/tourSchema");
const { Thread } = require("../models/threadSchema");
const { User } = require("../models/userSchema");

class SitemapService {
  static getStaticRoutes() {
    return [
      // Main Pages
      {
        url: "/",
        title: "Home",
        category: "Main",
      },
      {
        url: "/aboutUs",
        title: "About Us",
        category: "Main",
      },
      {
        url: "/discover",
        title: "Discover Tours",
        category: "Tours",
      },

      // Authentication Pages
      {
        url: "/auth/login",
        title: "Login",
        category: "Authentication",
      },
      {
        url: "/auth/register",
        title: "Register",
        category: "Authentication",
      },
      {
        url: "/auth/forgot-password",
        title: "Forgot Password",
        category: "Authentication",
      },

      // Community/Forum Pages
      {
        url: "/threads",
        title: "Community Forum",
        category: "Community",
      },
      {
        url: "/threads/new",
        title: "Create New Thread",
        category: "Community",
        requiresAuth: true,
      },
      {
        url: "/threads/my-posts",
        title: "My Posts",
        category: "Community",
        requiresAuth: true,
      },

      // User Dashboard Pages
      {
        url: "/user/profile",
        title: "User Profile",
        category: "User Dashboard",
        requiresAuth: true,
      },
      {
        url: "/user/settings",
        title: "User Settings",
        category: "User Dashboard",
        requiresAuth: true,
      },
      {
        url: "/user/booking",
        title: "My Trips",
        category: "User Dashboard",
        requiresAuth: true,
      },
      {
        url: "/user/save-tour",
        title: "User Saved Tours",
        category: "User Dashboard",
        requiresAuth: true,
      },

      // Tour Guide Pages
      {
        url: "/guide/dashboard",
        title: "Guide Dashboard",
        category: "Guide Dashboard",
        requiresAuth: true,
        role: "guide",
      },
      {
        url: "/guide/profile",
        title: "Guide Profile",
        category: "Guide Dashboard",
        requiresAuth: true,
        role: "guide",
      },
      {
        url: "/guide/settings",
        title: "Guide Settings",
        category: "Guide Dashboard",
        requiresAuth: true,
        role: "guide",
      },
      {
        url: "/guide/booking",
        title: "Booking Management",
        category: "Guide Dashboard",
        requiresAuth: true,
        role: "guide",
      },
      {
        url: "/createTour",
        title: "Create Tour",
        category: "Guide Dashboard",
        requiresAuth: true,
        role: "guide",
      },

      // Admin Pages
      {
        url: "/admin/dashboard",
        title: "Admin Dashboard",
        category: "Admin Panel",
        requiresAuth: true,
        role: "admin",
      },
      {
        url: "/admin/users",
        title: "User Management",
        category: "Admin Panel",
        requiresAuth: true,
        role: "admin",
      },
      {
        url: "/admin/certificates",
        title: "Certificate Management",
        category: "Admin Panel",
        requiresAuth: true,
        role: "admin",
      },
    ];
  }

  static async getDynamicRoutes() {
    try {
      const dynamicRoutes = [];

      const [tours, threads, guides] = await Promise.all([
        Tour.find({ deletedAt: null }).select("_id title").lean(),
        Thread.find({ status: "active" }).select("_id title").lean(),
        User.find({ role: "tourguide", isActive: true })
          .select("_id profileInfo.firstName profileInfo.lastName")
          .lean(),
      ]);

      // Add tour detail pages
      tours.forEach((tour) => {
        dynamicRoutes.push({
          url: `/tourDetail/${tour._id}`,
          title: tour.title,
          category: "Tour Details",
        });
      });

      // Add forum threads
      threads.forEach((thread) => {
        dynamicRoutes.push({
          url: `/threads/${thread._id}`,
          title: thread.title,
          category: "Forum Threads",
        });
      });

      // Add guide info pages
      guides.forEach((guide) => {
        const guideName = `${guide.profileInfo?.firstName || "Guide"} ${
          guide.profileInfo?.lastName || ""
        }`.trim();
        dynamicRoutes.push({
          url: `/guide/info/${guide._id}`,
          title: `Guide: ${guideName}`,
          category: "Guide Profiles",
        });
      });

      return dynamicRoutes;
    } catch (error) {
      console.error("Error fetching dynamic routes:", error);
      return [];
    }
  }

  static async generateSitemap() {
    try {
      const staticRoutes = this.getStaticRoutes();
      const dynamicRoutes = await this.getDynamicRoutes();

      // Group static routes
      const groupedStaticRoutes = staticRoutes.reduce((groups, route) => {
        if (!groups[route.category]) {
          groups[route.category] = [];
        }
        groups[route.category].push(route);
        return groups;
      }, {});

      // Group dynamic routes
      const groupedDynamicRoutes = dynamicRoutes.reduce((groups, route) => {
        if (!groups[route.category]) {
          groups[route.category] = [];
        }
        groups[route.category].push(route);
        return groups;
      }, {});

      // Sort routes within each category
      Object.keys(groupedStaticRoutes).forEach((category) => {
        groupedStaticRoutes[category].sort((a, b) => {
          return a.title.localeCompare(b.title);
        });
      });

      Object.keys(groupedDynamicRoutes).forEach((category) => {
        groupedDynamicRoutes[category].sort((a, b) => {
          return a.title.localeCompare(b.title);
        });
      });

      return {
        staticRoutes: groupedStaticRoutes,
        dynamicRoutes: groupedDynamicRoutes,
        totalStaticRoutes: staticRoutes.length,
        totalDynamicRoutes: dynamicRoutes.length,
        totalRoutes: staticRoutes.length + dynamicRoutes.length,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("Error generating sitemap:", error);
      throw error;
    }
  }
}

module.exports = SitemapService;
