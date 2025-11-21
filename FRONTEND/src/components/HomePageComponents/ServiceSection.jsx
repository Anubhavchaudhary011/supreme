import React from "react";
import { motion } from "framer-motion";
import {
  FaBullhorn,
  FaUsers,
  FaCheckCircle,
  FaChartLine,
  FaChalkboardTeacher,
  FaMoneyBillWave,
  FaHome,
  FaMoneyCheckAlt,
  FaArrowRight,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const services = [
  {
    icon: <FaBullhorn />,
    title: "In-Store Promotions",
    description:
      "Boost brand visibility through interactive retail campaigns that drive engagement and conversions.",
  },
  {
    icon: <FaMoneyBillWave />,
    title: "Retailer Payments",
    description:
      "Ensure complete visibility and transparency in last-mile payments through Direct Bank Transfer (DBT) — covering incentives, window display, etc.",
  },
  {
    icon: <FaChartLine />,
    title: "Mystery Audits",
    description:
      "Ensure service quality and consistency with expert mystery audits that provide detailed performance feedback and insights.",
  },
  {
    icon: <FaCheckCircle />,
    title: "Merchandising",
    description:
      "Optimize shelf presence and product display with data-driven visual merchandising strategies that maximize visibility and conversion.",
  },
  {
    icon: <FaChalkboardTeacher />,
    title: "Training",
    description:
      "Comprehensive employee training programs designed to enhance productivity, skill development, and workplace efficiency.",
  },
  {
    icon: <FaUsers />,
    title: "Consumer Activation",
    description:
      "Create memorable customer experiences with tailored activations that connect emotionally with your audience and inspire loyalty.",
  },
  {
    icon: <FaHome />,
    title: "Home to Home",
    description:
      "Door-to-door service solutions offering convenience, reliability, and personalized support for clients and customers.",
  },
  {
    icon: <FaMoneyCheckAlt />,
    title: "Payrolling",
    description:
      "Seamless payroll management services ensuring accurate processing, compliance, and timely disbursement for your workforce.",
  },
];

const ServiceSection = () => {
  return (
    <section
      id="services"
      className="py-20 bg-gradient-to-b from-black to-gray-900 text-center"
    >
      <h2 className="text-4xl md:text-5xl font-extrabold mb-20">
        Our <span className="text-red-500">Services</span>
      </h2>

      <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-10 px-6 md:px-20">
        {services.map((item, i) => (
          <motion.div
            key={i}
            whileHover={{
              scale: 1.05,
              y: -5,
              boxShadow: "0px 0px 25px rgba(239,68,68,0.5)",
            }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative bg-gray-900/80 border border-gray-700 rounded-2xl p-8 text-white shadow-md hover:border-red-600 transition-all group flex flex-col justify-between"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-red-600/30 via-transparent to-red-700/20 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="text-5xl text-red-600 mb-4">{item.icon}</div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-red-500 transition-colors">
                {item.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {item.description}
              </p>
            </div>

            {/* Read More Text */}
            <div className="relative z-10 text-center mt-auto">
              <Link
                to="/services"
                state={{ openService: item.title }}
                className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 hover:underline text-sm font-medium transition-all"
              >
                Read More <FaArrowRight className="text-xs mt-[2px]" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ServiceSection;
