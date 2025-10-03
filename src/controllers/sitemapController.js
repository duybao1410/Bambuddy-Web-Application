const SitemapService = require('../services/sitemapService');

class SitemapController {
  static async getSitemap(req, res) {
    try {
      const sitemapData = await SitemapService.generateSitemap();
      
      res.render('pages/sitemap', {
        title: 'Sitemap',
        ...sitemapData
      });
    } catch (error) {
      console.error('Error rendering sitemap:', error);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Unable to generate sitemap' 
      });
    }
  }
}

module.exports = SitemapController;