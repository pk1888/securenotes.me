import SEOLandingPage from '../components/SEOLandingPage';

export interface PageConfig {
  path: string;
  title: string;
  metaDescription: string;
  h1Text: string;
  introParagraphs: string[];
  supportSection: 'why-use' | 'when-to-use' | 'why-safer';
  faqs: Array<{ question: string; answer: string }>;
  ctaText: string;
}

export const seoPages: PageConfig[] = [
  // CORE HIGH-INTENT PAGES
  {
    path: '/send-private-note',
    title: 'Send Private Note - Self-Destructing Secure Messages | SecureNotes',
    metaDescription: 'Send private notes that delete themselves after being read. Create secure, one-time messages with end-to-end encryption. No accounts required.',
    h1Text: 'Send Private Note',
    introParagraphs: [
      'Create a private note that self-destructs after being read. Perfect for sharing sensitive information securely.',
      'Simply type your message, generate a link, and share it. Once opened, the note is permanently deleted.'
    ],
    supportSection: 'why-use',
    faqs: [
      { question: 'Is this really private?', answer: 'Yes. Notes are encrypted in your browser and deleted after reading. No tracking or accounts.' },
      { question: 'How long do notes last?', answer: 'You choose: 15 minutes to 7 days. Notes self-destruct after the set time or when opened.' },
      { question: 'Can I password protect notes?', answer: 'Yes. Add an optional password for extra security. The password is never sent to our servers.' }
    ],
    ctaText: 'Create your private note now — once it\'s opened, it\'s gone.'
  },
  {
    path: '/self-destruct-note',
    title: 'Self-Destruct Note - Auto-Delete Messages | SecureNotes',
    metaDescription: 'Create self-destructing notes that automatically delete after reading. Share sensitive information securely with automatic deletion.',
    h1Text: 'Self-Destruct Note',
    introParagraphs: [
      'Send messages that automatically destroy themselves after being read. Perfect for confidential information.',
      'Your note vanishes forever once viewed, leaving no digital trail or evidence.'
    ],
    supportSection: 'when-to-use',
    faqs: [
      { question: 'When are notes deleted?', answer: 'Immediately after being opened, or when your chosen time limit expires.' },
      { question: 'Can anyone recover deleted notes?', answer: 'No. Once deleted, notes are permanently gone and cannot be recovered.' },
      { question: 'Is this better than email?', answer: 'Yes. No email trail, automatic deletion, and end-to-end encryption.' }
    ],
    ctaText: 'Create your self-destructing note — it vanishes after reading.'
  },
  {
    path: '/temporary-note-link',
    title: 'Temporary Note Link - One-Time Secure Messages | SecureNotes',
    metaDescription: 'Create temporary note links that expire after one use. Share secure messages with time-limited access and automatic deletion.',
    h1Text: 'Temporary Note Link',
    introParagraphs: [
      'Generate a temporary link for your private note that expires after use. Perfect for time-sensitive information.',
      'Share the link confidently knowing it will self-destruct after being accessed.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'How long do links work?', answer: 'You choose the duration: 15 minutes to 7 days. Links stop working after expiration.' },
      { question: 'What happens after expiration?', answer: 'The note is automatically deleted and the link becomes invalid.' },
      { question: 'Can I extend the time?', answer: 'No. Once created, the time limit cannot be changed for security reasons.' }
    ],
    ctaText: 'Create your temporary note link — secure and time-limited.'
  },
  {
    path: '/secure-note-sharing',
    title: 'Secure Note Sharing - Encrypted Messages | SecureNotes',
    metaDescription: 'Share notes securely with end-to-end encryption. Send confidential messages with automatic deletion and maximum privacy.',
    h1Text: 'Secure Note Sharing',
    introParagraphs: [
      'Share notes with military-grade encryption and automatic deletion. Your information stays private and secure.',
      'Perfect for business communications, personal data, and sensitive information.'
    ],
    supportSection: 'why-use',
    faqs: [
      { question: 'How secure is the encryption?', answer: 'We use AES-256 encryption, the same standard used by banks and governments.' },
      { question: 'Can anyone intercept my notes?', answer: 'No. Notes are encrypted in your browser before transmission.' },
      { question: 'Do you store my IP address?', answer: 'We don\'t track users or store personal information.' }
    ],
    ctaText: 'Share your secure note now — encrypted and self-destructing.'
  },
  {
    path: '/one-time-note-link',
    title: 'One-Time Note Link - Single Use Messages | SecureNotes',
    metaDescription: 'Create one-time note links that work only once. Share secure messages that delete immediately after first access.',
    h1Text: 'One-Time Note Link',
    introParagraphs: [
      'Generate a link that works exactly once. Perfect for highly sensitive information.',
      'After the first viewing, both the note and link are permanently destroyed.'
    ],
    supportSection: 'when-to-use',
    faqs: [
      { question: 'What does one-time mean?', answer: 'The note can only be viewed once. After that, it\'s permanently deleted.' },
      { question: 'Can I share with multiple people?', answer: 'For multiple views, choose a higher max view limit when creating.' },
      { question: 'Is this the most secure option?', answer: 'Yes. One-time viewing combined with encryption provides maximum security.' }
    ],
    ctaText: 'Create your one-time note link — view once, then gone forever.'
  },

  // LONG-TAIL PAGES
  {
    path: '/send-message-that-deletes-itself',
    title: 'Send Message That Deletes Itself | SecureNotes',
    metaDescription: 'Send messages that automatically delete themselves after being read. Create self-destructing messages for maximum privacy.',
    h1Text: 'Send Message That Deletes Itself',
    introParagraphs: [
      'Create messages that automatically delete themselves after reading. No trace, no history, no evidence.',
      'Perfect for sensitive communications that need to disappear completely.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'How does self-deletion work?', answer: 'Messages are automatically deleted immediately after being viewed.' },
      { question: 'Can I delete messages manually?', answer: 'Messages auto-delete for security. Manual deletion isn\'t available.' },
      { question: 'Is there any record kept?', answer: 'No. Once deleted, messages leave no trace anywhere.' }
    ],
    ctaText: 'Send your self-destructing message now — it vanishes after reading.'
  },
  {
    path: '/create-private-note-link',
    title: 'Create Private Note Link - Secure Sharing | SecureNotes',
    metaDescription: 'Create private note links for secure sharing. Generate encrypted, self-destructing notes with customizable time limits.',
    h1Text: 'Create Private Note Link',
    introParagraphs: [
      'Generate a secure link for your private note. Share sensitive information with confidence.',
      'Your note is encrypted and will self-destruct after viewing or expiration.'
    ],
    supportSection: 'why-use',
    faqs: [
      { question: 'How do I create a link?', answer: 'Type your message, choose settings, and click create. Your link is generated instantly.' },
      { question: 'Can I customize the link?', answer: 'Links are automatically generated for security. Customization isn\'t available.' },
      { question: 'Are links traceable?', answer: 'No. We don\'t track who accesses links or when.' }
    ],
    ctaText: 'Create your private note link — secure and self-destructing.'
  },
  {
    path: '/temporary-secret-message',
    title: 'Temporary Secret Message - Vanishing Notes | SecureNotes',
    metaDescription: 'Send temporary secret messages that vanish after reading. Create time-limited, encrypted notes for sensitive information.',
    h1Text: 'Temporary Secret Message',
    introParagraphs: [
      'Send secret messages that disappear after reading. Perfect for confidential information.',
      'Your message stays secret and self-destructs, leaving no evidence behind.'
    ],
    supportSection: 'when-to-use',
    faqs: [
      { question: 'How long do messages last?', answer: 'You choose: 15 minutes to 7 days. Messages auto-delete after expiration.' },
      { question: 'Can anyone read my secret message?', answer: 'Only someone with the link can read it. Messages are encrypted.' },
      { question: 'What makes messages secret?', answer: 'Encryption, no accounts, and automatic deletion ensure privacy.' }
    ],
    ctaText: 'Send your temporary secret message — confidential and self-destructing.'
  },
  {
    path: '/anonymous-note-link',
    title: 'Anonymous Note Link - Private Sharing | SecureNotes',
    metaDescription: 'Create anonymous note links without registration. Send private messages securely with no tracking or accounts required.',
    h1Text: 'Anonymous Note Link',
    introParagraphs: [
      'Share notes anonymously with no registration or tracking. Your privacy is protected by design.',
      'Generate secure links that work without revealing your identity or creating accounts.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'Is it really anonymous?', answer: 'Yes. No accounts, no email, no tracking. Completely anonymous.' },
      { question: 'Do you store IP addresses?', answer: 'We don\'t track or store any identifying information.' },
      { question: 'Can notes be traced back?', answer: 'No. Once deleted, there\'s no way to trace notes back to anyone.' }
    ],
    ctaText: 'Create your anonymous note link — truly private sharing.'
  },
  {
    path: '/private-message-link',
    title: 'Private Message Link - Secure Sharing | SecureNotes',
    metaDescription: 'Create private message links for secure sharing. Send encrypted notes that self-destruct after reading.',
    h1Text: 'Private Message Link',
    introParagraphs: [
      'Generate private links for your messages. Share confidential information securely.',
      'Your message is encrypted and will disappear after being viewed.'
    ],
    supportSection: 'why-use',
    faqs: [
      { question: 'How private are the messages?', answer: 'Messages are encrypted and deleted after reading. Maximum privacy.' },
      { question: 'Can I share private messages?', answer: 'Yes. Share the link securely. Only recipients with the link can read.' },
      { question: 'Is this better than text messages?', answer: 'Yes. No phone records, automatic deletion, and encryption.' }
    ],
    ctaText: 'Create your private message link — secure and confidential.'
  },

  // PROBLEM-BASED PAGES
  {
    path: '/how-to-send-a-secret-message',
    title: 'How to Send a Secret Message | SecureNotes',
    metaDescription: 'Learn how to send secret messages securely. Create encrypted, self-destructing notes that protect your privacy.',
    h1Text: 'How to Send a Secret Message',
    introParagraphs: [
      'Sending secret messages is simple with SecureNotes. Type your message, create a link, and share it.',
      'Your message is encrypted and self-destructs after reading, ensuring complete privacy.'
    ],
    supportSection: 'when-to-use',
    faqs: [
      { question: 'How do I start?', answer: 'Type your message, choose settings, and click create. Share the generated link.' },
      { question: 'Is it really secret?', answer: 'Yes. Encryption and self-destruction ensure messages remain secret.' },
      { question: 'Can anyone read my message?', answer: 'Only someone with the link. Messages are encrypted and deleted.' }
    ],
    ctaText: 'Send your secret message now — simple, secure, and self-destructing.'
  },
  {
    path: '/how-to-share-password-securely',
    title: 'How to Share Password Securely | SecureNotes',
    metaDescription: 'Learn how to share passwords securely. Send encrypted, self-destructing notes with temporary access.',
    h1Text: 'How to Share Password Securely',
    introParagraphs: [
      'Share passwords securely using encrypted, self-destructing notes. Perfect for team access or client sharing.',
      'Passwords are automatically deleted after viewing, preventing unauthorized access.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'Is sharing passwords safe?', answer: 'Yes. Encryption and self-deletion make it much safer than email or chat.' },
      { question: 'Can I add extra security?', answer: 'Yes. Add a password to the note for two-factor protection.' },
      { question: 'What happens after sharing?', answer: 'The password note self-destructs after viewing, leaving no trace.' }
    ],
    ctaText: 'Share your password securely — encrypted and self-destructing.'
  },
  {
    path: '/how-to-send-sensitive-information-online',
    title: 'How to Send Sensitive Information Online | SecureNotes',
    metaDescription: 'Learn how to send sensitive information online securely. Create encrypted, self-destructing notes for maximum protection.',
    h1Text: 'How to Send Sensitive Information Online',
    introParagraphs: [
      'Send sensitive information online with confidence. Your data is encrypted and self-destructs automatically.',
      'Perfect for business data, personal information, or confidential communications.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'What counts as sensitive information?', answer: 'Passwords, financial data, personal details, business secrets, etc.' },
      { question: 'Is online sharing safe?', answer: 'Yes. Our encryption and self-deletion make online sharing secure.' },
      { question: 'Can I send business data?', answer: 'Yes. Perfect for sharing confidential business information securely.' }
    ],
    ctaText: 'Send your sensitive information now — secure and protected.'
  },
  {
    path: '/how-to-send-private-notes',
    title: 'How to Send Private Notes | SecureNotes',
    metaDescription: 'Learn how to send private notes securely. Create encrypted, self-destructing messages for confidential communication.',
    h1Text: 'How to Send Private Notes',
    introParagraphs: [
      'Sending private notes is simple and secure. Type your message, create a link, and share it confidently.',
      'Your notes are encrypted and automatically deleted after reading for maximum privacy.'
    ],
    supportSection: 'why-use',
    faqs: [
      { question: 'How do private notes work?', answer: 'Type your message, generate a link, and share. Notes self-destruct after viewing.' },
      { question: 'Are they really private?', answer: 'Yes. No tracking, no accounts, encryption, and auto-deletion ensure privacy.' },
      { question: 'Can I send multiple private notes?', answer: 'Yes. Create as many private notes as you need, each with its own link.' }
    ],
    ctaText: 'Send your private notes now — simple and completely secure.'
  },
  {
    path: '/how-to-send-confidential-information',
    title: 'How to Send Confidential Information | SecureNotes',
    metaDescription: 'Learn how to send confidential information securely. Create encrypted, self-destructing notes for business and personal use.',
    h1Text: 'How to Send Confidential Information',
    introParagraphs: [
      'Send confidential information with enterprise-grade security. Your data is encrypted and self-destructs.',
      'Perfect for business documents, legal information, or sensitive communications.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'What is confidential information?', answer: 'Business data, legal documents, financial information, trade secrets.' },
      { question: 'Is this suitable for business?', answer: 'Yes. Enterprise-grade encryption and auto-deletion meet security needs.' },
      { question: 'Can clients use this?', answer: 'Yes. Perfect for sharing confidential information with clients securely.' }
    ],
    ctaText: 'Send your confidential information now — business-grade security.'
  },

  // USE-CASE PAGES
  {
    path: '/send-password-securely',
    title: 'Send Password Securely - Encrypted Sharing | SecureNotes',
    metaDescription: 'Send passwords securely with encrypted, self-destructing notes. Share credentials safely with automatic deletion.',
    h1Text: 'Send Password Securely',
    introParagraphs: [
      'Share passwords securely using encrypted notes that self-destruct after viewing. Much safer than email or chat.',
      'Perfect for team access, client sharing, or temporary credential distribution.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'Is password sharing safe?', answer: 'Yes. Encryption and self-deletion make it much safer than traditional methods.' },
      { question: 'Can I add extra protection?', answer: 'Yes. Add a password to the note for two-factor security.' },
      { question: 'What happens after sharing?', answer: 'The password note self-destructs immediately after viewing.' }
    ],
    ctaText: 'Send your password securely — encrypted and self-destructing.'
  },
  {
    path: '/share-api-keys-securely',
    title: 'Share API Keys Securely - Encrypted Notes | SecureNotes',
    metaDescription: 'Share API keys securely using encrypted, self-destructing notes. Protect developer credentials with automatic deletion.',
    h1Text: 'Share API Keys Securely',
    introParagraphs: [
      'Share API keys and developer credentials securely. Your keys are encrypted and self-destruct after use.',
      'Perfect for team collaboration, client access, or temporary credential sharing.'
    ],
    supportSection: 'when-to-use',
    faqs: [
      { question: 'Are API keys safe to share this way?', answer: 'Yes. Much safer than email, chat, or plain text sharing.' },
      { question: 'Can I share multiple keys?', answer: 'Yes. Create separate notes for each key or group related keys together.' },
      { question: 'What about key rotation?', answer: 'Perfect for key rotation. Old keys self-destruct, new keys can be shared securely.' }
    ],
    ctaText: 'Share your API keys securely — encrypted and self-destructing.'
  },
  {
    path: '/send-private-info-online',
    title: 'Send Private Information Online Securely | SecureNotes',
    metaDescription: 'Send private information online with encrypted, self-destructing notes. Protect personal and sensitive data securely.',
    h1Text: 'Send Private Information Online',
    introParagraphs: [
      'Send private information online with confidence. Your data is encrypted and automatically deleted after reading.',
      'Perfect for personal data, confidential information, or sensitive communications.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'Is online sharing private?', answer: 'Yes. Encryption and self-deletion ensure your privacy online.' },
      { question: 'What kind of private information?', answer: 'Personal data, confidential details, sensitive communications.' },
      { question: 'Can I trust this with important data?', answer: 'Yes. Enterprise-grade encryption protects your important information.' }
    ],
    ctaText: 'Send your private information now — secure and confidential.'
  },
  {
    path: '/secure-note-for-clients',
    title: 'Secure Note for Clients - Professional Sharing | SecureNotes',
    metaDescription: 'Create secure notes for clients with encrypted, self-destructing messages. Professional, confidential communication.',
    h1Text: 'Secure Note for Clients',
    introParagraphs: [
      'Share confidential information with clients securely. Professional encrypted notes that self-destruct after reading.',
      'Perfect for business communications, client data, and professional confidentiality.'
    ],
    supportSection: 'when-to-use',
    faqs: [
      { question: 'Is this professional enough for clients?', answer: 'Yes. Enterprise-grade security meets professional standards.' },
      { question: 'Can I brand the notes?', answer: 'Notes are unbranded for security, maintaining professional confidentiality.' },
      { question: 'What can I share with clients?', answer: 'Passwords, documents, confidential data, business information.' }
    ],
    ctaText: 'Create your secure client note — professional and confidential.'
  },
  {
    path: '/temporary-note-for-sharing',
    title: 'Temporary Note for Sharing - Time-Limited Access | SecureNotes',
    metaDescription: 'Create temporary notes for sharing with time-limited access. Perfect for sensitive information with automatic deletion.',
    h1Text: 'Temporary Note for Sharing',
    introParagraphs: [
      'Create temporary notes perfect for sharing sensitive information. Set custom time limits and auto-deletion.',
      'Your note is encrypted and disappears after your chosen time limit or when viewed.'
    ],
    supportSection: 'when-to-use',
    faqs: [
      { question: 'How long can notes last?', answer: 'Choose from 15 minutes to 7 days. Perfect for any timeframe.' },
      { question: 'What happens when time expires?', answer: 'Notes are automatically deleted and links become invalid.' },
      { question: 'Can I share with multiple people?', answer: 'Yes. Set max views to control how many people can access.' }
    ],
    ctaText: 'Create your temporary sharing note — time-limited and secure.'
  },

  // COMPARISON PAGES
  {
    path: '/privnote-alternative',
    title: 'Privnote Alternative - Better Self-Destructing Notes | SecureNotes',
    metaDescription: 'Better than Privnote. Create self-destructing notes with stronger encryption, no tracking, and better privacy.',
    h1Text: 'Better Than Privnote',
    introParagraphs: [
      'Looking for a Privnote alternative with better privacy and security? SecureNotes offers enhanced encryption and no tracking.',
      'Enjoy self-destructing notes with military-grade encryption and complete anonymity.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'How are you better than Privnote?', answer: 'Stronger encryption, no tracking, no accounts, better privacy.' },
      { question: 'Do you track users like Privnote?', answer: 'No. We don\'t track, log, or store any user information.' },
      { question: 'Is your encryption stronger?', answer: 'Yes. We use AES-256 with proper key management.' }
    ],
    ctaText: 'Try our Privnote alternative — more secure and private.'
  },
  {
    path: '/onetimesecret-alternative',
    title: 'OneTimeSecret Alternative - Secure Notes | SecureNotes',
    metaDescription: 'Better than OneTimeSecret. Create self-destructing notes with enhanced security, no tracking, and better privacy.',
    h1Text: 'Better Than OneTimeSecret',
    introParagraphs: [
      'Searching for a OneTimeSecret alternative? SecureNotes provides superior privacy with no tracking and stronger encryption.',
      'Enjoy self-destructing notes with complete anonymity and military-grade security.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'Why choose over OneTimeSecret?', answer: 'No tracking, stronger encryption, better privacy protection.' },
      { question: 'Do you store IP addresses?', answer: 'No. We don\'t track or store any identifying information.' },
      { question: 'Is your security better?', answer: 'Yes. AES-256 encryption with proper security practices.' }
    ],
    ctaText: 'Switch from OneTimeSecret — more secure and private.'
  },
  {
    path: '/best-private-note-sharing-tool',
    title: 'Best Private Note Sharing Tool | SecureNotes',
    metaDescription: 'The best tool for sharing private notes securely. Self-destructing messages with encryption and no tracking.',
    h1Text: 'Best Private Note Sharing Tool',
    introParagraphs: [
      'Discover why SecureNotes is the best tool for private note sharing. Military-grade encryption and automatic deletion.',
      'Share confidential information with confidence using the most secure self-destructing notes available.'
    ],
    supportSection: 'why-use',
    faqs: [
      { question: 'What makes you the best?', answer: 'Strongest encryption, no tracking, self-destruction, ease of use.' },
      { question: 'How do you compare to others?', answer: 'Better security, more privacy, no accounts, automatic deletion.' },
      { question: 'Are you really the most secure?', answer: 'Yes. AES-256 encryption with no tracking provides maximum security.' }
    ],
    ctaText: 'Use the best private note tool — secure and reliable.'
  },
  {
    path: '/secure-note-vs-email',
    title: 'Secure Note vs Email - Why Secure Notes Are Better | SecureNotes',
    metaDescription: 'Secure notes vs email: why self-destructing encrypted notes are better for sharing sensitive information.',
    h1Text: 'Secure Notes vs Email',
    introParagraphs: [
      'Email leaves a permanent trail. Secure notes self-destruct after reading, leaving no evidence.',
      'Choose secure notes for sensitive information instead of risky email communications.'
    ],
    supportSection: 'why-safer',
    faqs: [
      { question: 'Why are secure notes better than email?', answer: 'Self-destruction, encryption, no permanent trail, more secure.' },
      { question: 'Can emails be traced?', answer: 'Yes. Emails leave permanent records that can be traced and accessed.' },
      { question: 'What about email encryption?', answer: 'Even encrypted emails leave records. Secure notes leave none.' }
    ],
    ctaText: 'Choose secure notes over email — safer and more private.'
  },
  {
    path: '/temporary-note-vs-password-manager',
    title: 'Temporary Note vs Password Manager | SecureNotes',
    metaDescription: 'Temporary notes vs password managers: when to use self-destructing notes for secure sharing vs long-term storage.',
    h1Text: 'Temporary Notes vs Password Managers',
    introParagraphs: [
      'Password managers store credentials long-term. Temporary notes are for one-time secure sharing.',
      'Use temporary notes when you need to share passwords securely, not store them permanently.'
    ],
    supportSection: 'when-to-use',
    faqs: [
      { question: 'When should I use temporary notes?', answer: 'For one-time sharing: team access, client sharing, temporary credentials.' },
      { question: 'When should I use password managers?', answer: 'For long-term storage of your own passwords and credentials.' },
      { question: 'Can I use both?', answer: 'Yes. Use password managers for storage, temporary notes for secure sharing.' }
    ],
    ctaText: 'Use temporary notes for sharing — password managers for storage.'
  }
];

// Export a function to get page config by path
export const getPageConfig = (path: string): PageConfig | undefined => {
  return seoPages.find(page => page.path === path);
};
