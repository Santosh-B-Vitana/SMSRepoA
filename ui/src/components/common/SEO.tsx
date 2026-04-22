import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
}

const defaultMeta: SEOProps = {
  title: 'School Management System',
  description: 'Comprehensive school management system for modern educational institutions',
  keywords: 'school management, education, student management, attendance, fees',
  author: 'School Management System',
  type: 'website',
  siteName: 'School Management System'
};

export function SEO({
  title,
  description,
  keywords,
  author,
  image,
  url,
  type,
  siteName
}: SEOProps) {
  const meta = {
    title: title ? `${title} | ${defaultMeta.title}` : defaultMeta.title,
    description: description || defaultMeta.description,
    keywords: keywords || defaultMeta.keywords,
    author: author || defaultMeta.author,
    image: image || '/vitana-logo.jpg',
    url: url || window.location.href,
    type: type || defaultMeta.type,
    siteName: siteName || defaultMeta.siteName
  };

  useEffect(() => {
    // Update document title
    document.title = meta.title || '';

    // Update or create meta tags
    const metaTags = [
      { name: 'description', content: meta.description },
      { name: 'keywords', content: meta.keywords },
      { name: 'author', content: meta.author },
      
      // Open Graph
      { property: 'og:title', content: meta.title },
      { property: 'og:description', content: meta.description },
      { property: 'og:image', content: meta.image },
      { property: 'og:url', content: meta.url },
      { property: 'og:type', content: meta.type },
      { property: 'og:site_name', content: meta.siteName },
      
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: meta.title },
      { name: 'twitter:description', content: meta.description },
      { name: 'twitter:image', content: meta.image },
    ];

    metaTags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
      let element = document.querySelector(selector);

      if (!element) {
        element = document.createElement('meta');
        if (name) element.setAttribute('name', name);
        if (property) element.setAttribute('property', property);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content || '');
    });

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = meta.url || '';

  }, [meta.title, meta.description, meta.keywords, meta.author, meta.image, meta.url, meta.type, meta.siteName]);

  return null;
}

// Page-specific SEO configurations
export const SEOConfig = {
  Dashboard: {
    title: 'Dashboard',
    description: 'Overview of your school management dashboard'
  },
  Students: {
    title: 'Students',
    description: 'Manage student records, admissions, and profiles'
  },
  Staff: {
    title: 'Staff Management',
    description: 'Manage staff members, roles, and assignments'
  },
  Attendance: {
    title: 'Attendance',
    description: 'Track and manage student and staff attendance'
  },
  Fees: {
    title: 'Fee Management',
    description: 'Manage fee structures, payments, and collections'
  },
  Examinations: {
    title: 'Examinations',
    description: 'Manage exams, grades, and report cards'
  },
  Library: {
    title: 'Library Management',
    description: 'Manage library books, issues, and returns'
  },
  Transport: {
    title: 'Transport',
    description: 'Manage school transport routes and students'
  },
  Hostel: {
    title: 'Hostel Management',
    description: 'Manage hostel rooms and student assignments'
  },
  Analytics: {
    title: 'Analytics',
    description: 'View comprehensive school analytics and reports'
  },
  Reports: {
    title: 'Reports',
    description: 'Generate and manage school reports'
  }
};
