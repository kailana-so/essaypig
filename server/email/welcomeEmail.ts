import { MONTHLY } from '../utils/constants';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
console.log('RESEND:', process.env.RESEND_API_KEY);

import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export const welcomeEmail = async (to: string, group: string) => {

  const schedule = group === MONTHLY 
  ? 'Essays will be picked at random and emailed on the 1st of the month with a link to the google hang out.' 
  : 'Essays will be picked at random and emailed on Mondays each fortnight';


  const res = await resend.emails.send({
    from: 'oink@essaypig.com',
    to,
    subject: '🐷📚 Welcome to Essay Pig',
    html: `
      <div style="padding: 0 0 1rem 0; font-family: monospace, 'Inconsolata', sans-serif; font-size: 14px; color: #333;">
        <div style="text-align: left; margin-bottom: 1rem;">
          <img src="https://essaypig.com/essay-pig.svg" alt="Essay Pig logo" style="height: 40px;" />
        </div>
        <br />
        <div style="text-align: left; margin: 1rem 0;">
          <p>Hi ${group} piggy, you're all set up!</p>
          <br />
          <p>The rules are simple:</p>
          <ol style="padding-left: 1rem;">
            <li>Links, PDFs and EPUBs are supported. (Links kinda preferred though)</li>
            <li>Nothing too big to handle – MAX 30MB.</li>
            <li>Don't spam the system.</li>
            <li>It's a private group, so new members need to be approved first.</li>
          </ol>
          <br />
          <p>
            ${schedule}
          </p>
          <p>
            To get started, head over to <a href="https://essaypig.com" style="color: #3b82f6;">essaypig.com</a> and start feeding the pig.
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
