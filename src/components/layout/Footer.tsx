import { Link } from "react-router-dom";
import { Linkedin, Twitter, Instagram, Mail } from "lucide-react";

const footerLinks = {
  platform: [
    { name: "About B4", path: "/about" },
    { name: "Boxes Directory", path: "/boxes" },
    { name: "Programs", path: "/programs" },
    { name: "Success Stories", path: "/stories" },
  ],
  programs: [
    { name: "Natural Role Decoder", path: "/programs#decoder" },
    { name: "Earning by Building", path: "/programs#earning" },
    { name: "Co-Builders", path: "/programs#cobuilders" },
    { name: "Startup Creation", path: "/programs#startup" },
  ],
  join: [
    { name: "Become an Entrepreneur", path: "/join?role=entrepreneur" },
    { name: "Become a Co-Builder", path: "/join?role=cobuilder" },
    { name: "Partner with Us", path: "/join?role=partner" },
    { name: "Contact", path: "/contact" },
  ],
};

const socialLinks = [
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Mail, href: "mailto:hello@b4platform.com", label: "Email" },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-md bg-background/10 flex items-center justify-center">
                <span className="text-background font-semibold text-sm">B4</span>
              </div>
              <span className="font-semibold">Platform</span>
            </Link>
            <p className="text-background/60 text-sm leading-relaxed mb-6 max-w-sm">
              Building the future through equity-based collaboration. Where entrepreneurs meet 
              co-builders and turn ideas into impactful startups.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-9 h-9 rounded-md bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium mb-4 text-sm">Platform</h4>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4 text-sm">Programs</h4>
            <ul className="space-y-2">
              {footerLinks.programs.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4 text-sm">Join Us</h4>
            <ul className="space-y-2">
              {footerLinks.join.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/50">
            © {new Date().getFullYear()} B4 Platform. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-background/50">
            <Link to="/privacy" className="hover:text-background transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-background transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
