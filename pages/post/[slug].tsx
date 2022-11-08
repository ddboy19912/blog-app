import { GetStaticProps } from 'next';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { sanityClient, urlFor } from '../../sanity';
import { Post } from '../../typings';
import PortableText from 'react-portable-text';
import { useForm, SubmitHandler } from 'react-hook-form';

interface FormInput {
  _id: string;
  name: string;
  email: string;
  comment: string;
}

interface Props {
  posts: Post;
}

const Post = ({ posts }: Props) => {
  const [submitted, setSubmitted] = useState(false);

  console.log(posts);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>();

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    await fetch('/api/createComments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
      .then(() => {
        console.log(data);
        setSubmitted(true);
      })
      .catch((err) => {
        console.log(err);
        setSubmitted(false);
      });
  };

  return (
    <main>
      <Header />
      <img
        className="w-full h-60 object-cover "
        src={urlFor(posts.mainImage).url()!}
        alt=""
      />

      <article className="max-w-3xl mx-auto p-5">
        <h1 className="text-4xl mt-10 mb-3">{posts.title}</h1>
        <h2 className="text-xl font-light text-gray-500 mb-2">
          {posts.description}
        </h2>
        <div className="flex items-center gap-3 ">
          <img
            className="h-10 w-10 rounded-full"
            src={urlFor(posts.author.image).url()!}
            alt=""
          />
          <p className="text-sm font-extralight">
            Blog Post by{' '}
            <span className="text-green-600">{posts.author.name}</span> -
            Published at {new Date(posts._createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <PortableText
            className="mt-10"
            content={posts.body}
            projectId={process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!}
            dataset={process.env.NEXT_PUBLIC_SANITY_DATASET!}
            serializers={{
              h1: (props: any) => {
                <h1 className="text-2xl font-bold my-5" {...props} />;
              },
              h2: (props: any) => {
                <h2 className="text-xl font-bold my-5" {...props} />;
              },
              li: ({ children }: any) => {
                <li className="ml-4 list-disc">{children} </li>;
              },
              link: ({ href, children }: any) => {
                <a className="text-blue-500 hover:underline" href={href}>
                  {children}
                </a>;
              },
            }}
          />
        </div>
      </article>
      <hr className="max-w-lg mx-auto border border-yellow-500" />

      {submitted ? (
        <div className="flex flex-col p-10 my-10 bg-yellow-500 text-white max-w-2xl mx-auto">
          <h3 className="text-3xl font-bold">
            Thank you for submitting your comment!
          </h3>
          <p>Once it has been approved, it will appear below!</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col p-5 max-w-2xl mx-auto mb-10"
        >
          <h3 className="text-sm text-yellow-500">Enjoyed this article?</h3>
          <h4 className="text-3xl font-bold">Leave a comment below</h4>
          <hr className="py-3 mt-2" />

          <input
            {...register('_id')}
            type="hidden"
            name="_id"
            value={posts._id}
          />

          <label className="block mb-5">
            <span className="text-gray-700">Name</span>
            <input
              {...register('name', { required: true })}
              className="shadow border rounded py-3 px-3 mt-1 block w-full form-input ring-yellow-500 outline-none focus:ring "
              placeholder="John HigginBottom"
              type="text"
            />
          </label>
          <label className="block mb-5">
            <span className="text-gray-700">Email</span>
            <input
              {...register('email', { required: true })}
              className="shadow border rounded py-3 px-3 mt-1 block w-full form-input ring-yellow-500 outline-none focus:ring"
              placeholder="JHiggins@gmail.com"
              type="email"
            />
          </label>
          <label className="block mb-5">
            <span className="text-gray-700">Comment</span>
            <textarea
              {...register('comment', { required: true })}
              className="shadow border rounded py-2 px-3 mt-1 block w-full form-textarea ring-yellow-500 outline-none focus:ring "
              placeholder="Leave a Comment"
              rows={8}
            />
          </label>

          <div className="flex flex-col p-5">
            {errors.name && (
              <span className="text-red-500">- Name Field is required</span>
            )}
            {errors.email && (
              <span className="text-red-500">- Email Field is required</span>
            )}
            {errors.comment && (
              <span className="text-red-500">- Comment Field is required</span>
            )}
          </div>

          <input
            type="submit"
            className="shadow bg-yellow-500 hover:bg-yellow-400 cursor-pointer focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded "
          />
        </form>
      )}

      <div className="flex flex-col p-10 my-10 max-w-2xl mx-auto shadow-yellow-500 shadow space-y-2">
        <h3 className="text-4xl">Comments</h3>
        <hr className="pb-2" />

        {posts.comments.map((comment) => (
          <div key={comment._id}>
            <p className="font-semibold">
              <span className="text-yellow-500">{comment.name}:</span>
              {'  '}
              {comment.comment}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
};

export default Post;

export const getStaticPaths = async () => {
  const query = `
*[_type == "post"]{
  _id,
  title,
  slug {
  current
}
}
`;

  const posts = await sanityClient.fetch(query);

  const paths = posts.map((post: Post) => ({
    params: {
      slug: post.slug.current,
    },
  }));

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const query = `
    *[_type == "post" && slug.current == $slug][0]{
  _id,
  _createdAt,
  title,
  author -> {
  name,
  image,
},
'comments': *[
    _type == "comment" &&
    post._ref == ^._id &&
    approved == true],
description,
mainImage,
  slug,
body
}
    `;

  const posts = await sanityClient.fetch(query, {
    slug: params?.slug,
  });

  if (!posts) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      posts,
    },
    revalidate: 60,
  };
};
