import { Resend } from 'resend';
import { MONTHLY } from '../constants';

const resend = new Resend(process.env.RESEND_API_KEY);

export const scheduledEmail = async (to: string, group: string, essay: string, summary: { title: string, body: string }) => {

    const schedule = group === MONTHLY 
    ? '<a href="https://meet.google.com/vzj-jvsr-ybo">Google hangout</a> as per usual.' 
    : 'Pub Friday?';


  const res = await resend.emails.send({
    from: 'oink@essaypig.com',
    to,
    subject: '🐷📚 Your essay is here.',
    html: `
      <div style="padding: 0 0 1rem 0; font-family: monospace, 'Inconsolata', sans-serif; font-size: 14px; color: #333;">
        <div style="text-align: left; margin-bottom: 1rem;">
          <img src="https://essaypig.com/essay-pig.svg" alt="Essay Pig logo" style="height: 40px;" />
        </div>
        <br />
        <br />
        <div style="text-align: left; margin: 1rem 0;">
          <p>Hi ${group} piggy, 
          </p>
          <p>Your essay is: <a href="${essay}" style="color: #3b82f6;">${essay}</a>.</p>
          <p>
            The link will be available for 24 hours.
          </p>
          <br />
          <h3>
            ${summary.title}
          </h3>
          <p>
            ${summary.body}
          </p>
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
