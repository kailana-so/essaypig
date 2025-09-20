import { Resend } from 'resend';
import { MONTHLY } from '../utils/constants';
import dotenv from 'dotenv';
import path from 'path';
import { meetLink } from '../utils/meetlink';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

export const reminderEmail = async (to: string, group: string, summary: { title: string, body: string, questions: { question1: string, question2: string } }) => {

  const schedule = group === MONTHLY
    ? `<a href="${meetLink('vzj-jvsr-ybo')}">Click here to join the call</a>.`
    : `<a href="${meetLink('ead-jgpg-uyd')}">Click here at 6:30 to join…</a> or meet at the pub?`;

  const subject = group === MONTHLY 
  ? `BBTC starts at 7:30`
  : `It's BITEXT club pub time!`;

  await resend.emails.send({
    headers: {
      'List-Unsubscribe': `<https://essaypig.com/unsubscribe?email=${encodeURIComponent(to)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    },
    from: 'oink@essaypig.com',
    to,
    subject: `🐷📚 ${subject}`,
    html: `
      <div style="padding: 0 0 1rem 0; font-family: monospace, 'Inconsolata', sans-serif; font-size: 14px; color: #333;">
        <div style="text-align: left; margin-bottom: 1rem;">
          <img src="https://essaypig.com/essay-pig.png" alt="Essay Pig logo" style="height: 40px; width: auto; display: block;" />
        </div>
        <br />
        <br />
        <div style="text-align: left; margin: 1rem 0;">
          <p>Evening ${group} piggy, </p>
          <p> It's time for book club.</p>
          <br />
           <h3>
            ${summary.title}
          </h3>
          <ul>
            <li><em>${summary.questions.question1}</em></li>
            <li><em>${summary.questions.question2}</em></li>
          </ul>
          <p>
            ${schedule}
          </p>
        </div>

        <div style="margin-top: 2rem; text-align: center;">
          <pre style="font-family: monospace; font-size: 9px; line-height: 1.2; color: #555;">
███████╗███████╗███████╗ █████╗ ██╗   ██╗    ██████╗ ██╗ ██████╗ 
██╔════╝██╔════╝██╔════╝██╔══██╗╚██╗ ██╔╝    ██╔══██╗██║██╔════╝ 
█████╗  ███████╗███████╗███████║ ╚████╔╝     ██████╔╝██║██║  ███╗
██╔══╝  ╚════██║╚════██║██╔══██║  ╚██╔╝      ██╔═══╝ ██║██║   ██║
███████╗███████║███████║██║  ██║   ██║       ██║     ██║╚██████╔╝
╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝       ╚═╝     ╚═╝ ╚═════╝
          </pre>
        </div>
      </div>
    `,
  });
};
