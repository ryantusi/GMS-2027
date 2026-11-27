import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import {
  MapPin,
  Phone,
  At,
  Paperclip,
  X,
} from '@phosphor-icons/react';
import { gsap, useGSAP } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';
import { Footer } from '../Footer';
import siteData from '../../content/site.json';

type SubmitState = 'idle' | 'sending' | 'sent' | 'error';

interface FormValues {
  email: string;
  subject: string;
  message: string;
  honeypot: string;
}

interface FormErrors {
  email?: string;
  subject?: string;
  message?: string;
  attachment?: string;
}

/** Custom phone-integrated-with-globe SVG icon matching Contact channel badge proportions */
export function InternationalPhoneIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
    >
      {/* Phone handset on the left */}
      <path
        d="M62 44C46 46 36 60 32 82C26 114 26 144 34 176C40 200 54 214 70 214C77 214 84 210 86 202L90 184C92 176 88 168 80 165L68 160C63 158 60 153 59 147C57 134 57 120 59 107C60 101 63 96 68 94L80 89C88 86 91 78 89 70L85 52C83 45 73 43 62 44Z"
        fill="currentColor"
      />
      {/* Globe outer arc (open toward handset on left) */}
      <path
        d="M108 66A74 74 0 1 1 114 194"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Latitude & longitude grid lines */}
      <path
        d="M148 54V202M144 54Q112 128 144 202M152 54Q192 128 152 202M100 128H222M104 88Q152 98 214 88M106 168Q152 158 214 168"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Stylized eastern hemisphere continents */}
      <path
        d="M176 98C176 86 190 76 206 78C212 84 214 96 204 104C194 106 182 106 176 98Z"
        fill="currentColor"
      />
      <path
        d="M164 126C172 114 192 114 204 124C214 132 214 146 204 156C196 164 194 178 184 180C176 180 174 166 170 156C160 148 158 134 164 126Z"
        fill="currentColor"
      />
    </svg>
  );
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const ACCEPTED_EXTENSIONS = /\.(pdf|xls|xlsx|csv|doc|docx|jpg|jpeg|png|webp)$/i;

/**
 * Section 10: Contact & Footer (Light Editorial Split — Unified Single-Screen Layout)
 * - Theme: Light Sea Salt (`--sea-salt`), Deep Hull ink (`--deep-hull`), `data-nav-theme="light"`.
 * - Sized so the contact channels, enquiry form, and ocean footer fit together inside one screen.
 * - Left column: Editorial heading and structured Deep Hull icon rows (Office Address, Phone Lines,
 *   International Line, Email Addresses with smooth aqua-blue hover states).
 * - Right column: Elevated white enquiry card with Email + Subject in one row, Message details,
 *   optional RFQ file attachment, inline validation, store prefill, and multi-state submit button.
 * - Bottom: Integrated interactive Ocean Footer anchored directly beneath the contact grid.
 */
export function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const checkPathRef = useRef<SVGPathElement>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingIframeSubmitRef = useRef(false);
  const iframeTimeoutRef = useRef<number | null>(null);

  const prefilledStoreEnquiry = useAppStore((s) => s.prefilledStoreEnquiry);
  const setPrefilledStoreEnquiry = useAppStore((s) => s.setPrefilledStoreEnquiry);

  const [reduceMotion, setReduceMotion] = useState(false);
  const [values, setValues] = useState<FormValues>({
    email: '',
    subject: '',
    message: '',
    honeypot: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [isPressed, setIsPressed] = useState(false);

  const contactCopy = siteData?.contact_section;
  const fieldsCopy = contactCopy?.fields;
  const submitCopy = contactCopy?.submit;
  const bandCopy = contactCopy?.details_band;
  const officesInfo = siteData?.contact_and_offices;
  const emails = officesInfo?.emails ?? [];
  const phones = officesInfo?.phones ?? [];
  const internationalLine = officesInfo?.international_line ?? '+1 945 9972408';
  const headOffice = officesInfo?.head_office;
  const opsEmail = emails[0] ?? 'info@globalmarinesupplies.com';
  const ajaxEndpoint =
    contactCopy?.form_endpoint?.trim() ||
    'https://formsubmit.co/ajax/info@globalmarinesupplies.com';
  const standardEndpoint = ajaxEndpoint.replace(/\/ajax\//i, '/');

  // Detect reduced motion preference via gsap.matchMedia()
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          canAnimate: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          setReduceMotion(Boolean(context.conditions?.reduceMotion));
        }
      );
      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  // Pre-fill subject and message and focus Email when visitor arrives from a Store's "Request" button
  useEffect(() => {
    if (!prefilledStoreEnquiry) return;

    setValues((prev) => ({
      ...prev,
      subject: prev.subject ? prev.subject : `Enquiry: ${prefilledStoreEnquiry}`,
      message: prev.message
        ? prev.message
        : `Enquiry for ${prefilledStoreEnquiry} — Port of call & ETA: `,
    }));

    window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 150);

    setPrefilledStoreEnquiry(null);
  }, [prefilledStoreEnquiry, setPrefilledStoreEnquiry]);

  // Animate DrawSVG checkmark when submitState becomes 'sent'
  useGSAP(
    () => {
      if (submitState === 'sent' && checkPathRef.current) {
        if (reduceMotion) {
          gsap.set(checkPathRef.current, { drawSVG: '0% 100%' });
        } else {
          gsap.fromTo(
            checkPathRef.current,
            { drawSVG: '0% 0%' },
            { drawSVG: '0% 100%', duration: 0.45, ease: 'power2.out' }
          );
        }
      }
    },
    { scope: formCardRef, dependencies: [submitState, reduceMotion] }
  );

  // Field validation logic
  const validateField = (field: keyof FormValues, val: string): string | undefined => {
    const trimmed = val.trim();
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      return !emailRegex.test(trimmed) ? fieldsCopy?.email_error : undefined;
    }
    if (field === 'subject') {
      return trimmed.length < 2 ? fieldsCopy?.subject_error : undefined;
    }
    if (field === 'message') {
      return trimmed.length < 6 ? fieldsCopy?.message_error : undefined;
    }
    return undefined;
  };

  const handleFieldChange = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value),
      }));
    }
  };

  const handleFieldBlur = (field: keyof FormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, values[field]),
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        attachment: fieldsCopy?.attachment_error_size,
      }));
      e.target.value = '';
      return;
    }

    const isAcceptedType =
      ACCEPTED_MIME_TYPES.includes(file.type) ||
      ACCEPTED_EXTENSIONS.test(file.name);

    if (!isAcceptedType) {
      setErrors((prev) => ({
        ...prev,
        attachment: fieldsCopy?.attachment_error_type,
      }));
      e.target.value = '';
      return;
    }

    setErrors((prev) => ({ ...prev, attachment: undefined }));
    setAttachment(file);
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setErrors((prev) => ({ ...prev, attachment: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerErrorShake = () => {
    if (reduceMotion || !submitBtnRef.current) return;
    gsap.fromTo(
      submitBtnRef.current,
      { x: -7 },
      {
        x: 0,
        duration: 0.4,
        ease: 'elastic.out(1.2, 0.25)',
      }
    );
  };

  useEffect(() => {
    return () => {
      if (iframeTimeoutRef.current !== null) {
        window.clearTimeout(iframeTimeoutRef.current);
      }
    };
  }, []);

  const handleIframeLoad = () => {
    if (!pendingIframeSubmitRef.current) return;
    pendingIframeSubmitRef.current = false;
    if (iframeTimeoutRef.current !== null) {
      window.clearTimeout(iframeTimeoutRef.current);
      iframeTimeoutRef.current = null;
    }
    setSubmitState('sent');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitState === 'sending' || submitState === 'sent') return;

    // Honeypot check
    if (values.honeypot) return;

    const newErrors: FormErrors = {
      email: validateField('email', values.email),
      subject: validateField('subject', values.subject),
      message: validateField('message', values.message),
      attachment: errors.attachment,
    };

    setTouched({
      email: true,
      subject: true,
      message: true,
    });
    setErrors(newErrors);

    const hasValidationErrors = Object.values(newErrors).some(Boolean);
    if (hasValidationErrors) {
      triggerErrorShake();
      return;
    }

    // FormSubmit's /ajax/ endpoint drops file uploads; submit natively as multipart/form-data
    // to the standard endpoint via a hidden iframe when an attachment is included.
    if (attachment && formRef.current) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSubmitState('error');
        triggerErrorShake();
        return;
      }

      if (iframeTimeoutRef.current !== null) {
        window.clearTimeout(iframeTimeoutRef.current);
      }

      pendingIframeSubmitRef.current = true;
      setSubmitState('sending');

      iframeTimeoutRef.current = window.setTimeout(() => {
        if (!pendingIframeSubmitRef.current) return;
        pendingIframeSubmitRef.current = false;
        iframeTimeoutRef.current = null;
        setSubmitState('error');
        triggerErrorShake();
      }, 35000);

      formRef.current.submit();
      return;
    }

    setSubmitState('sending');

    try {
      const cleanEmail = values.email.trim();
      const cleanSubject = values.subject.trim();
      const cleanMessage = values.message.trim();

      const formData = new FormData();
      formData.append('email', cleanEmail);
      formData.append('subject', cleanSubject);
      formData.append('message', cleanMessage);
      formData.append('_subject', `[GMS Website Enquiry] ${cleanSubject}`);
      formData.append('_replyto', cleanEmail);
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');
      formData.append('_honey', values.honeypot);

      const response = await fetch(ajaxEndpoint, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      let result: { success?: boolean | string; message?: string } | null = null;
      try {
        result = (await response.json()) as {
          success?: boolean | string;
          message?: string;
        };
      } catch {
        result = null;
      }

      const isConfirmed =
        response.ok &&
        (result?.success === true || result?.success === 'true');

      if (!isConfirmed) {
        throw new Error(result?.message || 'Submission failed');
      }

      setSubmitState('sent');
    } catch {
      setSubmitState('error');
      triggerErrorShake();
    }
  };

  const handleResetEnquiry = () => {
    pendingIframeSubmitRef.current = false;
    if (iframeTimeoutRef.current !== null) {
      window.clearTimeout(iframeTimeoutRef.current);
      iframeTimeoutRef.current = null;
    }
    setValues({
      email: '',
      subject: '',
      message: '',
      honeypot: '',
    });
    setTouched({});
    setErrors({});
    handleRemoveAttachment();
    setSubmitState('idle');
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      data-nav-theme="light"
      className="relative w-full bg-sea-salt text-deep-hull border-t border-harbour-mist/80 lg:min-h-[100dvh] flex flex-col justify-between"
    >
      <div className="flex-1 flex items-center pt-20 pb-3 lg:pt-[84px] lg:pb-4 px-6 md:px-12">
        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Heading & Structured Contact Channels */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <h2 className="font-display text-[clamp(2rem,2.9vw,2.75rem)] font-normal leading-[1.06] tracking-tight text-deep-hull text-balance">
              {contactCopy?.heading ?? "Let's Connect"}
            </h2>
            <p className="mt-2.5 max-w-[46ch] font-sans text-[14px] leading-relaxed text-deep-hull/72">
              {contactCopy?.reassurance}
            </p>

            {/* Structured Contact Channels */}
            <div className="mt-5 space-y-3.5">
              {/* 1. Office Address */}
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-deep-hull text-sea-salt shadow-hull"
                >
                  <MapPin size={18} weight="regular" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-sans text-[13.5px] font-semibold text-deep-hull">
                    {bandCopy?.col3_title ?? 'Office Address'}
                  </h3>
                  <p className="mt-0.5 max-w-[42ch] font-sans text-[13.5px] leading-relaxed text-deep-hull/75">
                    {headOffice?.address}
                  </p>
                </div>
              </div>

              {/* 2. Phone Lines */}
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-deep-hull text-sea-salt shadow-hull"
                >
                  <Phone size={18} weight="regular" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-sans text-[13.5px] font-semibold text-deep-hull">
                    {bandCopy?.col1_title ?? 'Phone Lines'}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {phones.map((phone, idx) => (
                      <span key={phone} className="inline-flex items-center gap-3">
                        <a
                          href={`tel:${phone.replace(/\s+/g, '')}`}
                          className="font-sans text-[13.5px] tabular-nums text-deep-hull/80 transition-colors duration-300 ease-out hover:text-[#00A9CE]"
                        >
                          {phone}
                        </a>
                        {idx < phones.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="text-deep-hull/25 select-none"
                          >
                            |
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. International Line */}
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-deep-hull text-sea-salt shadow-hull"
                >
                  <InternationalPhoneIcon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-sans text-[13.5px] font-semibold text-deep-hull">
                    {bandCopy?.international_title ?? 'International Line'}
                  </h3>
                  <div className="mt-1">
                    <a
                      href={`tel:${internationalLine.replace(/\s+/g, '')}`}
                      className="font-sans text-[13.5px] tabular-nums text-deep-hull/80 transition-colors duration-300 ease-out hover:text-[#00A9CE]"
                    >
                      {internationalLine}
                    </a>
                  </div>
                </div>
              </div>

              {/* 4. Email Addresses */}
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-deep-hull text-sea-salt shadow-hull"
                >
                  <At size={18} weight="regular" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-sans text-[13.5px] font-semibold text-deep-hull">
                    {bandCopy?.col2_title ?? 'Email Addresses'}
                  </h3>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
                    {emails.map((email) => (
                      <a
                        key={email}
                        href={`mailto:${email}`}
                        className="w-fit font-sans text-[13.5px] text-deep-hull/80 transition-colors duration-300 ease-out hover:text-[#00A9CE]"
                      >
                        {email}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Elevated White Enquiry Form Card */}
          <div className="lg:col-span-6">
            <div
              ref={formCardRef}
              className="w-full rounded-[20px] bg-white text-deep-hull p-5 sm:p-6 shadow-hull-lg border border-harbour-mist/90 flex flex-col"
            >
              <h3 className="font-display text-[22px] lg:text-[26px] font-normal leading-tight tracking-tight text-deep-hull">
                {contactCopy?.form_title ?? 'Send an enquiry'}
              </h3>

              <iframe
                name="gms-formsubmit-frame"
                title="Form submission target"
                onLoad={handleIframeLoad}
                tabIndex={-1}
                aria-hidden="true"
                className="invisible fixed h-0 w-0 border-0 opacity-0 pointer-events-none"
              />

              <form
                ref={formRef}
                action={standardEndpoint}
                method="POST"
                encType="multipart/form-data"
                target="gms-formsubmit-frame"
                onSubmit={handleSubmit}
                noValidate
                className="mt-3.5 flex flex-col gap-3"
              >
                {/* FormSubmit Configuration Fields for Multipart Submission */}
                <input
                  type="hidden"
                  name="_subject"
                  value={`[GMS Website Enquiry] ${values.subject.trim()}`}
                />
                <input type="hidden" name="_replyto" value={values.email.trim()} />
                <input type="hidden" name="_template" value="table" />
                <input type="hidden" name="_captcha" value="false" />

                {/* Hidden Honeypot Field */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="gms-vessel-fax">Leave this field blank</label>
                  <input
                    id="gms-vessel-fax"
                    name="_honey"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.honeypot}
                    onChange={(e) => handleFieldChange('honeypot', e.target.value)}
                  />
                </div>

                {/* Row 1: Email & Subject side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block font-sans text-[12px] font-medium text-deep-hull/80 mb-1"
                    >
                      {fieldsCopy?.email_label}
                    </label>
                    <input
                      ref={emailInputRef}
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      value={values.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')}
                      placeholder={fieldsCopy?.email_placeholder}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? 'contact-email-error' : undefined
                      }
                      className={`w-full rounded-[10px] border bg-sea-salt/70 px-3 py-2 font-sans text-[13.5px] text-deep-hull placeholder:text-deep-hull/40 transition-colors duration-200 focus:bg-white ${
                        errors.email
                          ? 'border-red-600'
                          : 'border-harbour-mist focus:border-signal-blue'
                      }`}
                    />
                    {errors.email && (
                      <p
                        id="contact-email-error"
                        role="alert"
                        className="mt-0.5 text-[11px] leading-tight text-red-700"
                      >
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block font-sans text-[12px] font-medium text-deep-hull/80 mb-1"
                    >
                      {fieldsCopy?.subject_label ?? 'Subject'}
                    </label>
                    <input
                      id="contact-subject"
                      name="subject"
                      type="text"
                      required
                      value={values.subject}
                      onChange={(e) => handleFieldChange('subject', e.target.value)}
                      onBlur={() => handleFieldBlur('subject')}
                      placeholder={fieldsCopy?.subject_placeholder ?? 'Vessel name, IMO, or enquiry subject'}
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={
                        errors.subject ? 'contact-subject-error' : undefined
                      }
                      className={`w-full rounded-[10px] border bg-sea-salt/70 px-3 py-2 font-sans text-[13.5px] text-deep-hull placeholder:text-deep-hull/40 transition-colors duration-200 focus:bg-white ${
                        errors.subject
                          ? 'border-red-600'
                          : 'border-harbour-mist focus:border-signal-blue'
                      }`}
                    />
                    {errors.subject && (
                      <p
                        id="contact-subject-error"
                        role="alert"
                        className="mt-0.5 text-[11px] leading-tight text-red-700"
                      >
                        {errors.subject}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 2: Message / RFQ Details */}
                <div>
                  <label
                    htmlFor="contact-message"
                    className="block font-sans text-[12px] font-medium text-deep-hull/80 mb-1"
                  >
                    {fieldsCopy?.message_label}
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    value={values.message}
                    onChange={(e) => handleFieldChange('message', e.target.value)}
                    onBlur={() => handleFieldBlur('message')}
                    placeholder={fieldsCopy?.message_placeholder}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={
                      errors.message ? 'contact-message-error' : undefined
                    }
                    className={`w-full min-h-[104px] rounded-[10px] border bg-sea-salt/70 px-3 py-2.5 font-sans text-[13.5px] text-deep-hull placeholder:text-deep-hull/40 transition-colors duration-200 focus:bg-white resize-none ${
                      errors.message
                        ? 'border-red-600'
                        : 'border-harbour-mist focus:border-signal-blue'
                    }`}
                  />
                  {errors.message && (
                    <p
                      id="contact-message-error"
                      role="alert"
                      className="mt-0.5 text-[11px] leading-tight text-red-700"
                    >
                      {errors.message}
                    </p>
                  )}
                </div>

              {/* Row 4: Optional Attach a File Control */}
              <div>
                <input
                  ref={fileInputRef}
                  id="contact-attachment"
                  name="attachment"
                  type="file"
                  accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {!attachment ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dashed border-deep-hull/20 bg-sea-salt/60 px-3 py-2">
                    <label
                      htmlFor="contact-attachment"
                      className="inline-flex items-center gap-1.5 font-sans text-[12px] font-medium text-signal-blue transition-colors duration-300 ease-out hover:text-[#00A9CE] cursor-pointer"
                    >
                      <Paperclip size={14} weight="regular" />
                      <span>{fieldsCopy?.attachment_label}</span>
                    </label>
                    <span className="font-sans text-[11px] text-deep-hull/55">
                      {fieldsCopy?.attachment_hint}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-[10px] border border-deep-teal/35 bg-sea-salt px-3 py-1.5 text-[12px]">
                    <span className="truncate font-medium text-deep-hull">
                      {attachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      aria-label={fieldsCopy?.attachment_remove_label}
                      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-deep-hull/70 hover:text-red-700 transition-colors"
                    >
                      <X size={13} />
                      <span>{fieldsCopy?.attachment_remove_label}</span>
                    </button>
                  </div>
                )}

                {errors.attachment && (
                  <p role="alert" className="mt-0.5 text-[11px] leading-tight text-red-700">
                    {errors.attachment}
                  </p>
                )}
              </div>

              {/* Multi-State Submit CTA */}
              <div className="pt-0.5 flex flex-col items-center">
                <button
                  ref={submitBtnRef}
                  type="submit"
                  disabled={submitState === 'sending' || submitState === 'sent'}
                  onMouseDown={() => setIsPressed(true)}
                  onMouseUp={() => setIsPressed(false)}
                  onMouseLeave={() => setIsPressed(false)}
                  style={{
                    transform: isPressed ? 'scale(0.985)' : 'scale(1)',
                  }}
                  className={`relative flex h-[42px] items-center justify-center overflow-hidden bg-deep-hull text-sea-salt font-sans text-[13.5px] font-medium shadow-hull transition-all duration-300 ${
                    submitState === 'sending'
                      ? 'w-[42px] rounded-full'
                      : 'w-full rounded-[10px] hover:bg-signal-blue'
                  }`}
                >
                  {submitState === 'sending' ? (
                    <>
                      <span className="sr-only">
                        {submitCopy?.sending_label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-sea-salt/30 border-t-sea-salt"
                      />
                    </>
                  ) : submitState === 'sent' ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        className="h-4 w-4 stroke-sea-salt stroke-[2.5]"
                      >
                        <path
                          ref={checkPathRef}
                          d="M 5 13 L 10 18 L 19 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{submitCopy?.sent_label}</span>
                    </span>
                  ) : (
                    <span>{submitCopy?.idle_label}</span>
                  )}
                </button>
              </div>

              {/* Screen-Reader Live Region for Sent / Error States */}
              {(submitState === 'sent' || submitState === 'error') && (
                <div aria-live="polite" className="space-y-1.5">
                  {submitState === 'sent' && (
                    <div className="rounded-[10px] bg-sea-salt border border-harbour-mist p-3 text-[12px] text-deep-hull space-y-1.5">
                      <p className="leading-relaxed">
                        {submitCopy?.sent_confirmation}
                      </p>
                      <button
                        type="button"
                        onClick={handleResetEnquiry}
                        className="font-medium text-signal-blue transition-colors duration-300 ease-out hover:text-[#00A9CE] underline underline-offset-4"
                      >
                        {submitCopy?.reset_label}
                      </button>
                    </div>
                  )}

                  {submitState === 'error' && (
                    <div
                      role="alert"
                      className="rounded-[10px] border border-red-600/30 bg-red-50 p-3 text-[12px] text-red-900 space-y-1"
                    >
                      <p className="leading-relaxed">
                        {submitCopy?.error_message}{' '}
                        <a
                          href={`mailto:${opsEmail}`}
                          className="font-medium underline"
                        >
                          {opsEmail}
                        </a>
                        .
                      </p>
                    </div>
                  )}
                </div>
              )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Interactive Ocean Footer */}
      <Footer />
    </section>
  );
}

export default Contact;
