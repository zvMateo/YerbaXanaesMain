"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Send } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.email("Ingresá un email válido"),
  subject: z.string().min(3, "Escribí un asunto"),
  message: z
    .string()
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(1000, "El mensaje no puede superar los 1000 caracteres"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(_data: ContactFormData) {
    setSubmitting(true);
    // Simulated submission — replace with real API call (e.g. /api/contact)
    await new Promise((res) => setTimeout(res, 1000));
    setSubmitting(false);
    setSent(true);
    reset();
    toast.success("¡Mensaje enviado!", {
      description: "Te respondemos a la brevedad. ¡Gracias por escribirnos!",
    });
  }

  if (sent) {
    return (
      <div className="bg-yerba-50 rounded-2xl border border-yerba-100 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-yerba-100 flex items-center justify-center mx-auto mb-4">
          <Send className="h-8 w-8 text-yerba-600" aria-hidden="true" />
        </div>
        <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">
          ¡Mensaje recibido!
        </h3>
        <p className="text-stone-600 mb-6">
          Te respondemos a la brevedad. Gracias por contactarnos.
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-yerba-600 font-semibold hover:text-yerba-700 transition-colors cursor-pointer text-sm"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="contact-name"
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre"
          {...register("name")}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-yerba-400 focus:border-transparent transition-all"
          aria-describedby={errors.name ? "contact-name-error" : undefined}
        />
        {errors.name && (
          <p
            id="contact-name-error"
            className="mt-1.5 text-sm text-red-600"
            role="alert"
          >
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          {...register("email")}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-yerba-400 focus:border-transparent transition-all"
          aria-describedby={errors.email ? "contact-email-error" : undefined}
        />
        {errors.email && (
          <p
            id="contact-email-error"
            className="mt-1.5 text-sm text-red-600"
            role="alert"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact-subject"
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
          Asunto <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-subject"
          type="text"
          placeholder="¿En qué te podemos ayudar?"
          {...register("subject")}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-yerba-400 focus:border-transparent transition-all"
          aria-describedby={
            errors.subject ? "contact-subject-error" : undefined
          }
        />
        {errors.subject && (
          <p
            id="contact-subject-error"
            className="mt-1.5 text-sm text-red-600"
            role="alert"
          >
            {errors.subject.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
          Mensaje <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          rows={5}
          placeholder="Contanos tu consulta..."
          {...register("message")}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-yerba-400 focus:border-transparent transition-all resize-none"
          aria-describedby={
            errors.message ? "contact-message-error" : undefined
          }
        />
        {errors.message && (
          <p
            id="contact-message-error"
            className="mt-1.5 text-sm text-red-600"
            role="alert"
          >
            {errors.message.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-yerba-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-yerba-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-yerba-600/20"
      >
        {submitting ? (
          "Enviando..."
        ) : (
          <>
            Enviar mensaje
            <Send className="h-5 w-5" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
