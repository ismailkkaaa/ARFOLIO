export type PortfolioTab = 'about' | 'skills' | 'projects' | 'contact';

export const portfolio = {
  name: 'Ismail',
  role: 'Web Developer • UI/UX Designer',
  intro: 'I build modern websites, digital products and creative experiences.',
  skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Three.js', 'WebAR', 'UI/UX', 'Graphic Design'],
  sideSkills: ['React', 'TypeScript', 'Three.js', 'WebAR', 'UI/UX'],
  projects: [
    ['PixNova AI', 'AI image editing web application'],
    ['LiftLog', 'Gym workout tracking PWA'],
    ['SpotOn Portal', 'Education file management portal'],
    ['ARFOLIO', 'AR business card portfolio'],
  ],
  links: [
    ['WhatsApp', 'https://wa.me/'],
    ['Instagram', 'https://www.instagram.com/'],
    ['GitHub', 'https://github.com/ismailkkaaa'],
    ['Portfolio', 'https://albasith-portfolio.netlify.app/'],
  ],
} as const;

export const tabs: PortfolioTab[] = ['about', 'skills', 'projects', 'contact'];
