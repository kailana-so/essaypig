import { Resend } from 'resend';
import { MONTHLY, TYPE_EPUB, TYPE_PDF } from '../utils/constants';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

export const scheduledEmail = async (to: string, group: string, type: string, url: string, summary: { title: string, body: string, questions: { question1: string, question2: string } }) => {

  const schedule = group === MONTHLY 
  ? 'Third Tuesday of each month - <a href="https://meet.google.com/vzj-jvsr-ybo">meeting link</a>, as per usual.'  
  : 'Pub next Friday?';

  await resend.emails.send({
    from: 'oink@essaypig.com',
    to,
    subject: `🐷📚 Your new essay is here`,
    html: `
      <div style="padding: 0 0 1rem 0; font-family: monospace, 'Inconsolata', sans-serif; font-size: 14px; color: #333;">
        <div style="text-align: left; margin-bottom: 1rem;">
          <img src="https://essaypig.com/essay-pig.png" alt="Essay Pig logo" style="height: 40px; width: auto; display: block;" />
        </div>
        <br />
        <br />
        <div style="text-align: left; margin: 1rem 0;">
          <p>Evening ${group} piggy, 
          </p>
          <p>Your essay is: <a href="${url}" style="color: #3b82f6;">${summary.title}</a>.</p>
          ${type === TYPE_PDF || type === TYPE_EPUB ? '<p>The link will be available for 24 hours.</p>' : ''}
          <br />
          <h3>
            ${summary.title}
          </h3>
          <p>
            ${summary.body}
          </p>
          <li><em>${summary.questions.question1}</em></li>
          <li><em>${summary.questions.question2}</em></li>
          <br />
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
