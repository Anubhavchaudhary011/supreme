import React, { useState, useEffect, useRef } from "react";
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
} from "react-icons/fa";
import { useLocation } from "react-router-dom";

/* ---------- SERVICE DATA ---------- */

const services = [
  {
    icon: <FaBullhorn />,
    title: "In-Store Promotions",
    description:
      "Our in-store promotions are crafted to increase visibility, drive immediate sales, and build brand loyalty. We combine creativity with data-driven strategy to execute impactful retail campaigns. From interactive displays to personalized customer experiences, our focus is to turn foot traffic into loyal customers through strategic engagement and memorable interactions.",
    images: [
      "/inStorePromo1.png",
      "/inStorePromo2.jpg",
      "/inStorePromo3.jpg",
    ],
  },
  {
    icon: <FaMoneyBillWave />,
    title: "Retailer Payments",
    description:
      "DBT (Direct bank Transfer) helps being Visibility and transparency to last mile for payments / reimbursements of incentives, Window Display and Bonuses to retailer and ensure end-to-end to satisfaction of all parties. Gratification to retailers for using their Window display spaces or off-invoice incentive has always been a subject of opacity and pilferage, leading to multiple disputes and retailer dissatisfaction. Now CPE bring the end-to-end services to ENROL, EDUCATE, INFORM, EVALUATE AND TRANSFER payments without any middlemen, delivering 100% accuracy and satisfaction using DBT (Direct bank transfer)",
    images: [
      "/RetailerPayments1.jpg",
      "/RetailerPayments2.jpg",
    ],
  },
  {
    icon: <FaChartLine />,
    title: "Mystery Audits",
    description:
      "Gain accurate insights into your customer service quality and operational consistency through detailed mystery audits. Our specialists evaluate your brand from a consumer’s perspective, providing structured feedback and actionable improvement points.",
    image: "/mysteryAudits.jpg",
  },
  {
    icon: <FaCheckCircle />,
    title: "Merchandising",
    description:
      "Effective merchandising drives visibility and conversion. We optimize shelf arrangements, displays, and promotional placements to enhance consumer experience and brand recall.",
    images: [
      "/Merchandising1.jpg",
      "/Merchandising2.jpg",
      "/Merchandising3.jpg",
      "/Merchandising4.jpg",
    ],
  },
  {
    icon: <FaChalkboardTeacher />,
    title: "Training",
    description:
      "Empower your workforce through structured and engaging training programs. We combine industry knowledge with practical approaches to ensure measurable growth in performance and productivity.",
    images: ["/Training1.jpg", "/Training2.jpg", "/Training3.jpg"],
  },
  {
    icon: <FaUsers />,
    title: "Consumer Activation",
    description:
      "We bring brands to life through high-energy consumer activations that create strong emotional connections. Our team conceptualizes and manages experiential marketing campaigns that leave a lasting impression. From digital-to-field executions, we ensure every engagement reflects your brand’s story.",
    images: [
      "/ConsumerActivation1.jpg",
      "/ConsumerActivation2.jpg",
      "/ConsumerActivation3.jpg",
      "/ConsumerActivation4.jpg",
    ],
  },
  {
    icon: <FaHome />,
    title: "Home to Home",
    description:
      "Last Mile connect with the consumers at their door step is one of the strongest medium to engage and generate trail for your product and we offer Home to Home service with Relaiability and  ensure accrate reporting",
    images: [
      "/HomeToHome1.jpg",
      "/HomeToHome2.jpg",
      "/HomeToHome3.jpg",
      "/HomeToHome4.jpg",
    ],
  },
  {
    icon: <FaMoneyCheckAlt />,
    title: "Payrolling",
    description:
      "Our payroll services ensure accurate and compliant salary management while allowing you to focus on business growth.",
    image: "/payrollingtesting.jpg",
  },
];

/* ---------- ITEM COMPONENT ---------- */

const ServiceItem = ({ item, reversed }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = item.images || [item.image];

  useEffect(() => {
    if (!item.images) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [item.images, images.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 0.8 }}
      className={`flex flex-col-reverse md:flex-row items-center gap-12 ${reversed ? "md:flex-row-reverse" : ""
        }`}
    >
      {/* IMAGE */}
      <motion.div className="w-full md:w-1/2">
        <img
          src={images[currentIndex]}
          alt={item.title}
          className="rounded-2xl shadow-lg object-cover w-full h-50 md:h-80 border-2 border-black"
        />
      </motion.div>

      {/* TEXT */}
      <motion.div className="w-full md:w-1/2">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 border-4 border-red-600 text-3xl text-red-500">
            {item.icon}
          </div>
          <h3 className="text-2xl font-bold">{item.title}</h3>
        </div>

        <p className="text-gray-300 text-sm md:text-base leading-relaxed">
          {item.description}
        </p>
      </motion.div>
    </motion.div>
  );
};

/* ---------- MAIN COMPONENT ---------- */

const ServiceSection = () => {
  const location = useLocation();
  const serviceRefs = useRef([]);

  useEffect(() => {
    if (location.state?.openService) {
      const index = services.findIndex(
        (s) => s.title === location.state.openService
      );

      if (index !== -1 && serviceRefs.current[index]) {
        setTimeout(() => {
          const element = serviceRefs.current[index];
          const offset = element.offsetTop - 130;

          window.scrollTo({
            top: offset,
            behavior: "smooth",
          });
        }, 300);
      }
    }
  }, [location.state]);

  return (
    <section
      id="services"
      className="bg-gradient-to-b from-black via-gray-900 to-red-950 text-white py-20 px-6 md:px-24"
    >
      {/* HEADER */}
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 mt-10">
          Our <span className="text-red-500">Services</span>
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto text-sm md:text-base">
          We combine creativity, strategy, and technology to deliver powerful business solutions
          that drive performance, efficiency, and growth.
        </p>
      </div>

      {/* LIST */}
      <div className="space-y-24">
        {services.map((item, index) => (
          <div key={index} ref={(el) => (serviceRefs.current[index] = el)}>
            <ServiceItem item={item} reversed={index % 2 === 1} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ServiceSection;
