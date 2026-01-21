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
    <footer className="bg-b4-navy text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center shadow-glow-teal">
                <span className="text-white font-bold text-lg">B4</span>
              </div>
              <span className="font-semibold text-xl">Platform</span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-sm">
              Building the future through equity-based collaboration. Where entrepreneurs meet 
              co-builders and turn ideas into impactful startups.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-b4-teal hover:shadow-glow-teal transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-5 text-white">Platform</h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-white/60 hover:text-b4-teal transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-5 text-white">Programs</h4>
            <ul className="space-y-3">
              {footerLinks.programs.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-white/60 hover:text-b4-teal transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-5 text-white">Join Us</h4>
            <ul className="space-y-3">
              {footerLinks.join.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-white/60 hover:text-b4-teal transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} B4 Platform. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-white/50">
            <Link to="/privacy" className="hover:text-b4-teal transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-b4-teal transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
