// Plain-language guides that answer what business owners type into Google. Each one leads to LogBase, but is useful on its own.
// To add a guide: add an object here (slug = the web address) and it shows on /guides, gets its own page and is added to the sitemap.
// Facts about LogBase must stay true: only describe what the app really does.

export const GUIDES = [
  {
    slug: 'inventory-app-for-shops-in-nigeria',
    title: 'How to manage stock in your shop in Nigeria (and the app that does it for you)',
    short: 'Stop guessing what is on your shelf. A simple way to track stock, sales and profit.',
    description:
      'A simple guide for Nigerian shop owners: what to record, a daily routine that keeps your stock count right, and what to look for in an inventory and sales app.',
    published: '2026-10-11',
    intro:
      'If your stock count never matches what is on the shelf, or you only find out something finished when a customer asks for it, the problem is almost never your staff. It is the way the records are kept. This guide shows a simple routine that works in any shop, whether you sell provisions, phones, drugs, building materials or clothes.',
    sections: [
      {
        title: 'Why exercise books stop working',
        paras: [
          'A book works when you sell ten things a day. At fifty or a hundred sales a day, entries are missed, handwriting gets mixed up, and nobody can tell you how much stock is left without counting the whole shop.',
          'The bigger problem is that a book cannot answer questions. How much profit did we make this month? Which product moves fastest? What is Chuka still owing? Answers like these need records that can add themselves up.',
        ],
      },
      {
        title: 'What you should record for every product',
        items: [
          'The name, and the category it belongs to (for example Drinks, Grains, Phones).',
          'What you paid for it (cost price) and what you sell it for (selling price). Without both, you cannot know your profit.',
          'How many you have right now (opening stock).',
          'A low-stock level: the number at which you want a warning so you can reorder before it finishes.',
          'Who you buy it from, so you can compare suppliers and track what you owe them.',
        ],
      },
      {
        title: 'A daily routine that keeps the count right',
        items: [
          'Record every sale when it happens, not at the end of the day. Pick the product, quantity and how the customer paid.',
          'Record every purchase the same day the goods arrive, with the cost and how much you paid the supplier.',
          'Record returns and damaged or lost goods as stock adjustments, so the number in your records still matches the shelf.',
          'Once a week, count a few fast-moving products and compare. A small difference found early is easy to explain; a big one found at year end is not.',
        ],
      },
      {
        title: 'What to look for in an inventory and sales app',
        items: [
          'It works when the network is bad. A sale should never be lost because the signal dropped.',
          'It handles customers who pay later or pay in parts, because that is how many Nigerian businesses actually trade.',
          'Prices in naira and receipts you can send to a customer on WhatsApp.',
          'Staff accounts with limits, so a cashier can record sales without seeing your profit.',
          'You can download your records at any time. Your data should never be locked in.',
          'A price that makes sense for a small business.',
        ],
      },
      {
        title: 'How LogBase helps',
        paras: [
          'LogBase is built around this routine. You add your products with their prices and opening stock (or import them from a spreadsheet), then record sales and purchases every day. Stock goes down when you sell and up when you buy, and the dashboard shows what is low, what you sold today and how your business is doing.',
          'It keeps recording without internet and sends everything to your account when the connection returns. Customers who owe you, suppliers you owe and staff permissions are all built in. You can try it free for 14 days with no card, and keep using the free plan after that for a small business.',
        ],
      },
    ],
    related: ['how-to-track-customer-debts-in-your-shop', 'sell-without-internet-offline-sales-app'],
  },
  {
    slug: 'how-to-track-customer-debts-in-your-shop',
    title: 'How to track customers who owe you money in your shop',
    short: 'A simple system so no debt is forgotten, and a polite way to remind people.',
    description:
      'Customers who pay later are normal in Nigerian business, but forgotten debts cost real money. Learn a simple way to record, track and politely collect what you are owed.',
    published: '2026-10-11',
    intro:
      'Selling on credit builds loyal customers, but every unrecorded debt is money you may never see again. Most shop owners who lose money to debts have not been cheated; they just could not remember who owed what. Here is a simple system that fixes that.',
    sections: [
      {
        title: 'Why debts get forgotten',
        paras: [
          'A debt is written in a corner of a page, or kept in your head. A few weeks later the customer says it was less, or that they already paid part of it, and you cannot prove otherwise. Staff who sell on credit without telling you make it worse.',
        ],
      },
      {
        title: 'Four rules for selling on credit',
        items: [
          'Record the debt at the moment of the sale, with the customer\'s name and phone number. Never "I will write it later".',
          'Only give credit to customers you can contact. A name with no phone number is a risk.',
          'Agree the date they will pay, and say it clearly in front of them.',
          'Record every part payment as it comes in, so the balance is always up to date.',
        ],
      },
      {
        title: 'What a good debt record shows',
        items: [
          'The customer\'s name and phone number.',
          'Every sale on credit, with the date and what they took.',
          'Every payment they have made, with the date.',
          'One running balance: what they still owe today.',
        ],
      },
      {
        title: 'Reminding people without causing a quarrel',
        paras: [
          'Customers pay faster when you show them their statement: a clear list of what they took and what they paid. A written statement sent on WhatsApp is polite, it is hard to argue with, and the customer has it on their phone.',
          'Send reminders on the same day each week, keep the tone friendly, and thank people when they pay. Large debts deserve a phone call.',
        ],
      },
      {
        title: 'Setting limits',
        paras: [
          'Decide the most a customer can owe you at one time, and stop selling on credit once a customer passes it until they pay. Review your debtors list once a week so a small problem does not grow.',
        ],
      },
      {
        title: 'How LogBase helps',
        paras: [
          'In LogBase you can record a sale as fully paid, part paid or on credit, and attach it to a customer. Each customer has their own page with their running balance, purchase history and payment history. When they pay, you record the payment and the balance drops.',
          'You can send a customer their statement on WhatsApp or save it as a PDF, and the dashboard shows the total owed to you across all customers. The same idea works the other way for suppliers you owe.',
        ],
      },
    ],
    related: ['inventory-app-for-shops-in-nigeria', 'sell-without-internet-offline-sales-app'],
  },
  {
    slug: 'sell-without-internet-offline-sales-app',
    title: 'How to keep selling when the network is down',
    short: 'What an offline sales app really means, and how to avoid losing sales to a bad signal.',
    description:
      'Bad network should not stop your shop. Learn what an offline-first sales app does, how to set one up, and the simple habits that keep your records complete.',
    published: '2026-10-11',
    intro:
      'In many markets and shops, the network drops at the worst moment: a customer is waiting, you are in the middle of a sale, and the app stops loading. If your records depend on a steady connection, you either lose sales from your records or go back to the exercise book. An offline-first app solves this.',
    sections: [
      {
        title: 'What "works offline" should mean',
        paras: [
          'Offline does not mean the app only opens without internet. It means you can keep recording sales, and the app saves them safely on your phone or computer, then sends them to your account automatically when the connection comes back.',
          'The important details are that nothing is lost if you close the app, and that a sale is never counted twice when it is sent.',
        ],
      },
      {
        title: 'How to set it up so it works when you need it',
        items: [
          'Install the app on your phone\'s home screen (or your computer) so it opens like a normal app.',
          'Open it once while you are online so it can save your products and prices on the device.',
          'Open it online at least once a day, even briefly, so the saved information stays fresh and any waiting sales are sent.',
          'Keep your phone charged and storage free. A full phone can fail to save anything.',
        ],
      },
      {
        title: 'Habits that keep your records complete',
        items: [
          'Record sales as they happen, whether you have signal or not.',
          'Before closing for the day, check that nothing is still waiting to be sent.',
          'If you have several staff, make sure each of them has opened the app online recently.',
          'Do big changes, like editing prices or adding many products, when you have a good connection.',
        ],
      },
      {
        title: 'What cannot work offline',
        paras: [
          'Some things need the internet by nature: signing in on a new device for the first time, paying for a subscription, and seeing sales your other staff have recorded on their phones. Everything you do in the shop day to day can wait for the network.',
        ],
      },
      {
        title: 'How LogBase handles it',
        paras: [
          'LogBase is installed like an app and keeps recording sales without internet. Offline sales are saved on the device and sent to your account when the connection returns, without being counted twice. A "Saved sales" page shows anything still waiting.',
          'It works the same on a phone, tablet or computer, in every plan, including the free one.',
        ],
      },
    ],
    related: ['inventory-app-for-shops-in-nigeria', 'imei-tracking-for-phone-and-gadget-sellers'],
  },
  {
    slug: 'imei-tracking-for-phone-and-gadget-sellers',
    title: 'How phone and gadget sellers can track IMEI numbers and warranty',
    short: 'Record IMEIs when you buy and sell phones, and answer warranty questions in seconds.',
    description:
      'Phone sellers lose time and money on warranty and return disputes. Learn how to record IMEI numbers, link them to sales and look up any phone in seconds.',
    published: '2026-10-11',
    intro:
      'If you sell phones, laptops or other gadgets, every unit has a number that identifies it: the IMEI for phones, a serial number for most other devices. Recording it when you buy and when you sell turns many arguments into a quick lookup.',
    sections: [
      {
        title: 'Why IMEI records matter',
        items: [
          'A customer comes back with a phone and says it is faulty. Was it sold by you? When? Is the warranty still running?',
          'You can show a supplier exactly which unit a complaint is about.',
          'It protects you if a phone is later reported as stolen, because you can show who you bought it from and who bought it from you.',
          'It stops the same phone being sold or returned twice by mistake.',
        ],
      },
      {
        title: 'Where to find an IMEI',
        items: [
          'Dial *#06# on the phone. The number appears on the screen. A phone with two SIM slots shows two numbers.',
          'On the box label, usually next to a barcode.',
          'Under the battery, on the SIM tray, or on the back of the phone, depending on the model.',
        ],
      },
      {
        title: 'What to record, and when',
        items: [
          'When you receive stock: the IMEI of every unit, from which supplier, at what cost.',
          'When you sell: which exact units the customer took, so each one is linked to the sale and the customer.',
          'The warranty period you give, so you can see at a glance whether a returning phone is still covered.',
          'Returns and swaps, so the history of each unit stays complete.',
        ],
      },
      {
        title: 'Typing is slow. Scan instead.',
        paras: [
          'A 15-digit number typed by hand will eventually be mistyped. A USB or Bluetooth barcode scanner reads the IMEI barcode on the box and types it for you in a second. A phone camera can do the same job when you do not have a scanner.',
        ],
      },
      {
        title: 'How LogBase helps',
        paras: [
          'LogBase has IMEI and serial number tracking built in. Record the numbers when you receive stock and when you sell, either by typing, with a barcode scanner, or with your phone\'s camera. The warranty shows on the receipt.',
          'The IMEI lookup page finds any phone by its full number or just the last digits, and shows where it came from, who bought it, when, and whether the warranty is still running.',
        ],
      },
    ],
    related: ['inventory-app-for-shops-in-nigeria', 'how-to-track-customer-debts-in-your-shop'],
  },
];

export function getGuide(slug) {
  return GUIDES.find((g) => g.slug === slug) || null;
}
