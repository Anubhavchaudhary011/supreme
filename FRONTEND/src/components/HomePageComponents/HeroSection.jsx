import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const HeroSection = () => {
  const images = [
    "/hero_img1.png",
    "/hero_img2.png",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section className="relative h-screen flex flex-col justify-center items-center text-center overflow-hidden">
      {/* Background Image */}
      <img
        key={images[currentIndex]}
        src={images[currentIndex]}
        alt="Hero background"
        className="absolute w-full h-full object-cover opacity-40"
      />

      {/* dark overlay */}
      <div className="absolute inset bg-gradient-to-b from-black via-transparent to-black opacity-80" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="z-10 px-6"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
          Driving <span className="text-red-600">Performance</span> Through Activation
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto mb-8">
          Expert solutions for In-store Promotions, Merchandising, Activations & Mystery Audits.
        </p>
        <button
          onClick={() => {
            const element = document.getElementById("services");
            if (element) {
              element.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition-all cursor-pointer"
        >
          Explore Services
        </button>
      </motion.div>
    </section>
  );
};

export default HeroSection;
