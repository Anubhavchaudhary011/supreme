import React from "react";
import { motion } from "framer-motion";

const AboutSection = () => {
  return (
    <>
      {/* Who We Are */}
      <section className="overflow-x-hidden bg-gradient-to-b from-black via-gray-900 to-red-950 pt-32 pb-16 text-center md:text-left px-6 md:px-32 flex flex-col md:flex-row items-center gap-12">
        {/* Image (Left) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="md:w-1/2"
        >
          <img
            src="/about_img1.jpg"
            alt="Who We Are"
            className="rounded-2xl shadow-lg object-cover w-full h-80 md:h-[320px] border-2 border-[#44090a]"
          />
        </motion.div>

        {/* Text (Right) */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="md:w-1/2"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-red-500">
            Who We Are
          </h2>
          <p className="text-gray-300 leading-relaxed text-base md:text-lg">
            We are a team of professionals with 7+ years of experience in Retail
            rand management, In store activations, Retailer payments, Consumer activations, and Merchandising. Our
            PAN-India network ensures seamless execution and measurable results.
          </p>
        </motion.div>
      </section>

      {/* What We Do */}
      <section className="overflow-x-hidden bg-gradient-to-t from-black via-gray-900 to-red-950 pt-18 pb-16 text-center md:text-left px-6 md:px-32 flex flex-col md:flex-row-reverse items-center gap-12">
        {/* Image (Right) */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="md:w-1/2"
        >
          <img
            src="/about_img2.png"
            alt="What We Do"
            className="rounded-2xl shadow-lg object-cover w-full h-80 md:h-[320px]"
          />
        </motion.div>

        {/* Text (Left) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="md:w-1/2"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-red-500">
            What We Do
          </h2>
          <p className="text-gray-300 leading-relaxed text-base md:text-lg">
            Concept Promotions and events provides PAN India BTL engagement activities including end-to-end promoter and merchandiser management, weekend sampling, Retail branding and activation, consumer activations (wet/dry) across various touchpoints, mystery audits, Home to home selling, Event managemnet and customized merchandising like T-shirts, mugs, and corporate gifts.
          </p>
        </motion.div>
      </section>
    </>
  );
};

export default AboutSection;
